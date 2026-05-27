'use client';

import Link from 'next/link';
import '../info-page.css';


export default function ContactPage() {
    return (
        <div className="info-page">
            <div className="info-page__bg" />
            <nav className="info-page__nav">
                <Link href="/" className="info-page__nav-logo">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    <span>Clarix AI</span>
                </Link>
                <Link href="/" className="info-page__nav-back">&larr; Back to Home</Link>
            </nav>

            <div className="info-page__content">
                <span className="info-page__badge">Contact</span>
                <h1 className="info-page__title">Get in Touch</h1>
                <p className="info-page__subtitle">Whether you&apos;re interested in enterprise plans, have a partnership inquiry, or just want to say hello &mdash; we&apos;d love to hear from you.</p>

                <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
                    <div className="contact-form__row">
                        <input type="text" placeholder="First name" required />
                        <input type="text" placeholder="Last name" required />
                    </div>
                    <input type="email" placeholder="Work email" required />
                    <select defaultValue="">
                        <option value="" disabled>What can we help with?</option>
                        <option>Enterprise pricing</option>
                        <option>Partnership inquiry</option>
                        <option>Technical support</option>
                        <option>Press &amp; media</option>
                        <option>Other</option>
                    </select>
                    <textarea placeholder="Tell us more..." rows={5} />
                    <button type="submit" className="contact-form__btn">Send Message</button>
                </form>

                <h2>Other Ways to Reach Us</h2>
                <p><strong>Email:</strong> hello@Clarix.ai</p>
                <p><strong>Enterprise Sales:</strong> sales@Clarix.ai</p>
                <p><strong>Press:</strong> press@Clarix.ai</p>
            </div>
        </div>
    );
}
