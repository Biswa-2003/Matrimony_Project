"use client";

export default function ProfileGlobalStyles() {
    return (
        <style jsx global>{`
      .profile-surface {
        background-color: #f4f7fa;
        min-height: 100vh;
        padding-bottom: 60px;
      }
      .pe-card {
        border: 1px solid rgba(0, 0, 0, 0.06);
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
        background: #fff;
        overflow: hidden;
        margin-bottom: 24px;
      }
      .text-maroon {
        color: var(--brand-maroon, #800020) !important;
      }
      .text-primary {
        color: var(--brand-primary, #e33183) !important;
      }
      .bg-primary {
        background-color: var(--brand-primary, #e33183) !important;
      }
      .btn-primary {
        background-color: var(--brand-primary, #e33183);
        border-color: var(--brand-primary, #e33183);
      }
      .btn-outline-success:hover {
        background-color: #198754;
        color: #fff;
      }
    `}</style>
    );
}
