<?php
defined( 'ABSPATH' ) || exit;

/**
 * Attaches email validation to supported form systems.
 *
 * Decision modes (from LeadCop_API::evaluate):
 *   block = true  → prevent form submission, show error message
 *   warn  = true  → allow form submission, surface warning where the
 *                    integration provides a non-blocking message channel
 *   both false    → allow silently
 */
class LeadCop_Hooks {

    public static function init() {
        // WordPress core — registration
        if ( get_option( 'leadcop_hook_wp_register', '1' ) === '1' ) {
            add_filter( 'registration_errors', array( __CLASS__, 'validate_wp_register' ), 10, 3 );
            add_action( 'register_form', array( __CLASS__, 'render_wp_register_warn' ) );
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

        // Contact Form 7
        if ( class_exists( 'WPCF7' ) && get_option( 'leadcop_hook_cf7', '1' ) === '1' ) {
            add_filter( 'wpcf7_validate_email', array( __CLASS__, 'validate_cf7_email' ), 20, 2 );
            add_filter( 'wpcf7_validate_email*', array( __CLASS__, 'validate_cf7_email' ), 20, 2 );
        }

        // WPForms
        if ( function_exists( 'wpforms' ) && get_option( 'leadcop_hook_wpforms', '1' ) === '1' ) {
            add_action( 'wpforms_process_validate_email', array( __CLASS__, 'validate_wpforms_email' ), 10, 3 );
        }

        // Gravity Forms
        if ( class_exists( 'GFCommon' ) && get_option( 'leadcop_hook_gravityforms', '1' ) === '1' ) {
            add_filter( 'gform_field_validation', array( __CLASS__, 'validate_gravity_email' ), 10, 4 );
        }
    }

    // ─── Helper ─────────────────────────────────────────────────────────────────

    /**
     * Run the API check and return the decision array.
     *
     * @return array{ block: bool, warn: bool, message: string }
     */
    private static function get_decision( $email ) {
        $result = LeadCop_API::check_email( $email );
        return LeadCop_API::evaluate( $result );
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
            // Store warning in a transient keyed to the user email; displayed
            // by render_wp_register_warn() on the next page load.
            set_transient( 'leadcop_warn_' . md5( $user_email ), $d['message'], 120 );
        }
        return $errors;
    }

    /**
     * Render a non-blocking warning banner on the registration form.
     * Displayed when the form is re-shown after a warn-mode submission.
     */
    public static function render_wp_register_warn() {
        $email = isset( $_POST['user_email'] ) ? sanitize_email( wp_unslash( $_POST['user_email'] ) ) : '';
        if ( ! $email ) {
            return;
        }
        $key     = 'leadcop_warn_' . md5( $email );
        $message = get_transient( $key );
        if ( $message ) {
            delete_transient( $key );
            printf(
                '<p class="message" style="color:#92400e;background:#fffbeb;border:1px solid #fcd34d;padding:10px 14px;border-radius:6px;margin:12px 0;">%s</p>',
                esc_html( $message )
            );
        }
    }

    // ─── WordPress Comments ──────────────────────────────────────────────────────

    public static function validate_wp_comment( $commentdata ) {
        if ( empty( $commentdata['comment_author_email'] ) ) {
            return $commentdata;
        }
        $d = self::get_decision( $commentdata['comment_author_email'] );
        if ( $d['block'] ) {
            wp_die( esc_html( $d['message'] ), esc_html__( 'Email Error', 'leadcop' ), array( 'back_link' => true ) );
        }
        // warn: comment proceeds — no blocking action taken
        return $commentdata;
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
            // WooCommerce My Account registration shows notices via wc_add_notice
            // before the form; registration still proceeds.
            wc_add_notice( esc_html( $d['message'] ), 'notice' );
        }
        return $errors;
    }

    // ─── Contact Form 7 ─────────────────────────────────────────────────────────

    public static function validate_cf7_email( $result, $tag ) {
        $email = isset( $_POST[ $tag->name ] ) ? sanitize_email( wp_unslash( $_POST[ $tag->name ] ) ) : '';
        if ( ! $email ) {
            return $result;
        }
        $d = self::get_decision( $email );
        if ( $d['block'] ) {
            // Invalidating the tag prevents CF7 from sending the mail.
            $result->invalidate( $tag, esc_html( $d['message'] ) );
        }
        // warn: CF7 does not have a native non-blocking inline message API
        // during validation; form proceeds and mail is sent as normal.
        return $result;
    }

    // ─── WPForms ────────────────────────────────────────────────────────────────

    public static function validate_wpforms_email( $field_id, $field_submit, $form_data ) {
        $email = sanitize_email( $field_submit );
        if ( ! $email ) {
            return;
        }
        $d = self::get_decision( $email );
        if ( $d['block'] ) {
            wpforms()->process->errors[ $form_data['id'] ][ $field_id ] = esc_html( $d['message'] );
        }
        // warn: WPForms field errors always block; form proceeds when warn-only.
    }

    // ─── Gravity Forms ───────────────────────────────────────────────────────────

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
        // warn: Gravity Forms field validation does not support non-blocking
        // inline messages; form proceeds when warn-only.
        return $result;
    }
}
