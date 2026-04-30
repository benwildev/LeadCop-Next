"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { 
  ArrowLeft, Calendar, Clock, User, Share2, Tag, Loader2 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { axiosSecure } from "@/lib/api-client-react";
import { useParams } from "next/navigation";

interface BlogPost {
  title: string;
  content: string;
  category: string;
  author: string;
  publishedAt: string;
  readTime: string;
  image?: string;
  tags: string[];
}

export function BlogSlugContent() {
  const { slug } = useParams();

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: ["/api/blog/posts", slug],
    queryFn: async () => {
      const response = await axiosSecure.get(`/api/blog/posts/${slug}`);
      return response.data.post;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-64 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-slate-400 font-medium text-sm">Preparing article...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-64 gap-6">
          <h1 className="text-3xl font-bold text-slate-900">Article not found</h1>
          <Link href="/blog" className="text-primary font-bold flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to blog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-20">
        <article>
          {/* Header */}
          <header className="bg-slate-50 border-b border-slate-100 py-24">
            <div className="mx-auto max-w-3xl px-6">
              <Link href="/blog" className="inline-flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-8 hover:text-primary transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to all articles
              </Link>
              
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-primary uppercase tracking-widest">
                  {post.category}
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.1]">
                {post.title}
              </h1>

              <div className="flex flex-wrap items-center gap-y-4 gap-x-8 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-300" />
                  {post.author}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-300" />
                  {post.publishedAt}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-300" />
                  {post.readTime}
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="mx-auto max-w-3xl px-6 py-20">
            {post.image && (
              <div className="mb-16 rounded-[40px] overflow-hidden shadow-2xl shadow-slate-200">
                <img src={post.image} alt={post.title} className="w-full h-auto" />
              </div>
            )}

            <div className="prose prose-slate prose-lg max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-3xl">
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>

            <div className="mt-20 pt-12 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex flex-wrap gap-2">
                {post.tags?.map(tag => (
                  <span key={tag} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 text-slate-500 text-xs font-medium border border-slate-100">
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
              <button className="inline-flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-900 transition-colors">
                <Share2 className="w-4 h-4" />
                Share article
              </button>
            </div>
          </div>
        </article>

        {/* Newsletter Hook */}
        <section className="bg-slate-950 py-24 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary rounded-full blur-[160px]" />
          </div>
          <div className="mx-auto max-w-4xl px-6 text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">
              Scale your lead quality with LeadCop.
            </h2>
            <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
              Join 2,400+ teams blocking disposable emails and protecting their growth funnels.
            </p>
            <Link href="/signup" className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:opacity-90 transition-all">
              Start for free today
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
