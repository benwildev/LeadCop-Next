<?php
defined( 'ABSPATH' ) || exit;

/**
 * Attaches email validation to supported form systems.
 *
 * Decision modes (from LeadCop_API::evaluate):
 *   block = true  → prevent form submission, show error to the user
 *   warn  = true  → allow form submission, surface warning where the
 *                    integration provides a suitable message channel:
 *                     - WooCommerce: inline wc_add_notice('notice')
 *                     - WP registration: login_message on the confirmation page
 *                     - CF7 / WPForms / GF: warning appended to the admin mail/entry
 *                     - WP comments: _leadcop_warning comment meta (visible in admin)
 *   both false    → allow silently
 */
class LeadCop_Hooks {

    /** Email-keyed decision cache for the current request. */
    private static $decision_cache = array();

    public static function init() {
        // WordPress core — registration
        if ( get_option( 'leadcop_hook_wp_register', '1' ) === '1' ) {
            add_filter( 'registration_errors', array( __CLASS__, 'validate_wp_register' ), 10, 3 );
            add_filter( 'login_message', array( __CLASS__, 'render_login_warn_message' ) );
        }

        // WordPress core — comments
        if ( get_option( 'leadcop_hook_wp_comment', '1' ) === '1' ) {
            add_filter( 'preprocess_comment', array( __CLASS__, 'validate_wp_comment' ) );
        }

        // WooCommerce
        if ( class_exists( 'WooCommerce' ) ) {
            if ( get_option( 'leadcop_hook_woo_checkout', '1' ) === '1' ) {
                add_action( 'woocommerce_checkout_process', array( __CLASS__, 'validate_woo_checkout' ) );
            }
            if ( get_option( 'leadcop_hook_woo_account', '1' ) === '1' ) {
                add_filter( 'woocommerce_registration_errors', array( __CLASS__, 'validate_woo_register' ), 10, 3 );
            }
        }

        // Contact Form 7 — validate and, for warn, annotate the admin mail.
        if ( class_exists( 'WPCF7' ) && get_option( 'leadcop_hook_cf7', '1' ) === '1' ) {
            add_filter( 'wpcf7_validate_email',  array( __CLASS__, 'validate_cf7_email' ), 20, 2 );
            add_filter( 'wpcf7_validate_email*', array( __CLASS__, 'validate_cf7_email' ), 20, 2 );
            add_action( 'wpcf7_before_send_mail', array( __CLASS__, 'annotate_cf7_mail_warn' ), 10, 3 );
        }

        // WPForms
        if ( function_exists( 'wpforms' ) && get_option( 'leadcop_hook_wpforms', '1' ) === '1' ) {
            add_action( 'wpforms_process_validate_email', array( __CLASS__, 'validate_wpforms_email' ), 10, 3 );
            add_action( 'wpforms_process_complete', array( __CLASS__, 'annotate_wpforms_entry_warn' ), 10, 4 );
        }

        // Gravity Forms
        if ( class_exists( 'GFCommon' ) && get_option( 'leadcop_hook_gravityforms', '1' ) === '1' ) {
            add_filter( 'gform_field_validation', array( __CLASS__, 'validate_gravity_email' ), 10, 4 );
            add_action( 'gform_entry_created', array( __CLASS__, 'annotate_gravity_entry_warn' ), 10, 2 );
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    /**
     * Run the API check and return the full decision array.
     * Results are cached per email per request to avoid duplicate API calls
     * when multiple hooks fire for the same submission.
     *
     * @return array{ block: bool, warn: bool, message: string }
     */
    private static function get_decision( $email ) {
        $email = sanitize_email( $email );
        if ( isset( self::$decision_cache[ $email ] ) ) {
            return self::$decision_cache[ $email ];
        }
        $result = LeadCop_API::check_email( $email );
        $d      = LeadCop_API::evaluate( $result );
        self::$decision_cache[ $email ] = $d;
        return $d;
    }

    /**
     * Store a pending registration warning so it can be shown on the
     * next login/confirmation page via the login_message filter.
     * A short transient with a random suffix is used to avoid conflicts
     * when concurrent registrations happen (unlikely but possible).
     */
    private static function store_register_warn( $message ) {
        $key = 'leadcop_rwarn_' . substr( md5( microtime() . wp_rand() ), 0, 8 );
        set_transient( $key, $message, 120 );
        // Store the transient key so the login_message filter can retrieve it.
        set_transient( 'leadcop_rwarn_key', $key, 120 );
    }

    // ─── WordPress Registration ──────────────────────────────────────────────────

    public static function validate_wp_register( $errors, $sanitized_user_login, $user_email ) {
        if ( $errors->get_error_code() ) {
            return $errors;
        }
        $d = self::get_decision( $user_email );
        if ( $d['block'] ) {
            $errors->add( 'leadcop_email_error', esc_html( $d['message'] ) );
        } elseif ( $d['warn'] ) {
            // Registration proceeds; warning is displayed on the confirmation
            // page (wp-login.php?checkemail=registered) via login_message filter.
            self::store_register_warn( $d['message'] );
        }
        return $errors;
    }

    /**
     * Append a LeadCop warning to the WP login page message area.
     * Triggered on the ?checkemail=registered page after a successful registration.
     */
    public static function render_login_warn_message( $message ) {
        $key = get_transient( 'leadcop_rwarn_key' );
        if ( ! $key ) {
            return $message;
        }
        $warn = get_transient( $key );
        if ( $warn ) {
            delete_transient( $key );
            delete_transient( 'leadcop_rwarn_key' );
            $message .= sprintf(
                '<p class="message" style="color:#92400e;background:#fffbeb;border:1px solid #fcd34d;padding:10px 14px;border-radius:6px;margin:12px 0;">%s</p>',
                esc_html( $warn )
            );
        }
        return $message;
    }

    // ─── WordPress Comments ──────────────────────────────────────────────────────

    public static function validate_wp_comment( $commentdata ) {
        if ( empty( $commentdata['comment_author_email'] ) ) {
            return $commentdata;
        }
        $d = self::get_decision( $commentdata['comment_author_email'] );
        if ( $d['block'] ) {
            wp_die( esc_html( $d['message'] ), esc_html__( 'Email Error', 'leadcop' ), array( 'back_link' => true ) );
        } elseif ( $d['warn'] ) {
            // Comment is allowed. Tag it so the admin can see the warning in
            // the comment moderation screen (stored as comment meta after save).
            // We attach an action that fires after the comment is inserted.
            $commentdata['_leadcop_warning'] = $d['message'];
            add_action( 'comment_post', array( __CLASS__, 'save_comment_warn_meta' ), 10, 1 );
        }
        return $commentdata;
    }

    /**
     * Save the LeadCop warning message as comment meta so it appears in the
     * admin comment edit screen.
     */
    public static function save_comment_warn_meta( $comment_id ) {
        // We can't pass the message directly via hook args; retrieve it from
        // the cached decision for the comment author's email.
        $comment = get_comment( $comment_id );
        if ( ! $comment ) {
            return;
        }
        $d = self::get_decision( $comment->comment_author_email );
        if ( $d['warn'] ) {
            add_comment_meta( $comment_id, '_leadcop_warning', $d['message'], true );
        }
    }

    // ─── WooCommerce Checkout ────────────────────────────────────────────────────

    public static function validate_woo_checkout() {
        $billing_email = isset( $_POST['billing_email'] ) ? sanitize_email( wp_unslash( $_POST['billing_email'] ) ) : '';
        if ( ! $billing_email ) {
            return;
        }
        $d = self::get_decision( $billing_email );
        if ( $d['block'] ) {
            // 'error' notice prevents checkout completion.
            wc_add_notice( esc_html( $d['message'] ), 'error' );
        } elseif ( $d['warn'] ) {
            // 'notice' is displayed inline but does NOT block the checkout.
            wc_add_notice( esc_html( $d['message'] ), 'notice' );
        }
    }

    // ─── WooCommerce My Account Registration ────────────────────────────────────

    public static function validate_woo_register( $errors, $username, $email ) {
        if ( $errors->get_error_code() ) {
            return $errors;
        }
        $d = self::get_decision( $email );
        if ( $d['block'] ) {
            $errors->add( 'leadcop_email_error', esc_html( $d['message'] ) );
        } elseif ( $d['warn'] ) {
            // 'notice' shows inline on the form but does not block registration.
            wc_add_notice( esc_html( $d['message'] ), 'notice' );
        }
        return $errors;
    }

    // ─── Contact Form 7 ─────────────────────────────────────────────────────────

    /**
     * Validate email fields in CF7 forms.
     * For block: invalidate the field (prevents mail send and shows inline error).
     * For warn:  allow submission; warning text is appended to the admin mail body
     *            in annotate_cf7_mail_warn() below.
     */
    public static function validate_cf7_email( $result, $tag ) {
        $email = isset( $_POST[ $tag->name ] ) ? sanitize_email( wp_unslash( $_POST[ $tag->name ] ) ) : '';
        if ( ! $email ) {
            return $result;
        }
        $d = self::get_decision( $email );
        if ( $d['block'] ) {
            $result->invalidate( $tag, esc_html( $d['message'] ) );
        }
        return $result;
    }

    /**
     * Append the LeadCop warning to the CF7 admin mail body when warn mode is
     * active and the email field contained a flagged but non-blocking address.
     *
     * @param WPCF7_ContactForm $contact_form
     * @param bool              $abort
     * @param WPCF7_Submission  $submission
     */
    public static function annotate_cf7_mail_warn( $contact_form, &$abort, $submission ) {
        if ( $abort ) {
            return;
        }
        $posted = $submission->get_posted_data();
        $fields = $contact_form->scan_form_tags( array( 'type' => array( 'email', 'email*' ) ) );
        foreach ( $fields as $tag ) {
            $email = isset( $posted[ $tag->name ] ) ? sanitize_email( $posted[ $tag->name ] ) : '';
            if ( ! $email ) {
                continue;
            }
            $d = self::get_decision( $email );
            if ( $d['warn'] ) {
                $mail = $contact_form->prop( 'mail' );
                $mail['body'] .= "\n\n--- LeadCop Warning ---\n" . $d['message'] . "\n";
                $contact_form->set_properties( array( 'mail' => $mail ) );
            }
        }
    }

    // ─── WPForms ────────────────────────────────────────────────────────────────

    /**
     * Block submissions with disposable/flagged emails during WPForms validation.
     */
    public static function validate_wpforms_email( $field_id, $field_submit, $form_data ) {
        $email = sanitize_email( $field_submit );
        if ( ! $email ) {
            return;
        }
        $d = self::get_decision( $email );
        if ( $d['block'] ) {
            wpforms()->process->errors[ $form_data['id'] ][ $field_id ] = esc_html( $d['message'] );
        }
    }

    /**
     * Append the LeadCop warning to a WPForms entry note when warn mode is active.
     * The note is visible to the admin in the WPForms entry detail view.
     *
     * @param array $fields
     * @param array $entry
     * @param array $form_data
     * @param int   $entry_id
     */
    public static function annotate_wpforms_entry_warn( $fields, $entry, $form_data, $entry_id ) {
        if ( ! function_exists( 'wpforms_log' ) ) {
            return;
        }
        foreach ( $fields as $field ) {
            if ( $field['type'] !== 'email' ) {
                continue;
            }
            $email = sanitize_email( $field['value'] );
            if ( ! $email ) {
                continue;
            }
            $d = self::get_decision( $email );
            if ( $d['warn'] ) {
                wpforms_log(
                    'LeadCop Warning',
                    $d['message'],
                    array( 'type' => array( 'entry' ), 'form_id' => $form_data['id'], 'parent' => $entry_id )
                );
            }
        }
    }

    // ─── Gravity Forms ───────────────────────────────────────────────────────────

    /**
     * Block invalid emails during Gravity Forms field validation.
     */
    public static function validate_gravity_email( $result, $value, $form, $field ) {
        if ( $field->type !== 'email' ) {
            return $result;
        }
        $email = sanitize_email( $value );
        if ( ! $email ) {
            return $result;
        }
        $d = self::get_decision( $email );
        if ( $d['block'] ) {
            $result['is_valid'] = false;
            $result['message']  = esc_html( $d['message'] );
        }
        return $result;
    }

    /**
     * Add a Gravity Forms entry note with the LeadCop warning when warn mode is
     * active. The note is visible in the admin entry detail view.
     *
     * @param array $entry
     * @param array $form
     */
    public static function annotate_gravity_entry_warn( $entry, $form ) {
        if ( ! class_exists( 'GFFormsModel' ) ) {
            return;
        }
        foreach ( $form['fields'] as $field ) {
            if ( $field->type !== 'email' ) {
                continue;
            }
            $email = sanitize_email( rgar( $entry, (string) $field->id ) );
            if ( ! $email ) {
                continue;
            }
            $d = self::get_decision( $email );
            if ( $d['warn'] ) {
                GFFormsModel::add_note(
                    $entry['id'],
                    0,
                    'LeadCop',
                    esc_html( $d['message'] ),
                    'warning'
                );
            }
        }
    }
}
