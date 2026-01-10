'use client';

interface SwellPreviewProps {
  html: string;
  className?: string;
}

export function SwellPreview({ html, className = '' }: SwellPreviewProps) {
  return (
    <div className={`swell-preview ${className}`}>
      <div
        className="swell-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <style jsx global>{`
        /* SWELL Theme Preview Styles */
        .swell-preview {
          font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
          line-height: 1.8;
          color: #333;
        }

        .swell-content {
          max-width: 100%;
        }

        .swell-content h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 2rem 0 1rem;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 4px;
        }

        .swell-content h3 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 1.5rem 0 0.75rem;
          padding-left: 0.75rem;
          border-left: 4px solid #667eea;
        }

        .swell-content h4 {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 1.25rem 0 0.5rem;
        }

        .swell-content p {
          margin: 1rem 0;
        }

        .swell-content ul,
        .swell-content ol {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }

        .swell-content li {
          margin: 0.5rem 0;
        }

        .swell-content a {
          color: #667eea;
          text-decoration: underline;
        }

        .swell-content a:hover {
          color: #764ba2;
        }

        .swell-content img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 1rem 0;
        }

        .swell-content blockquote {
          margin: 1.5rem 0;
          padding: 1rem 1.5rem;
          background: #f8f9fa;
          border-left: 4px solid #667eea;
          font-style: italic;
        }

        .swell-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
        }

        .swell-content th,
        .swell-content td {
          padding: 0.75rem;
          border: 1px solid #dee2e6;
          text-align: left;
        }

        .swell-content th {
          background: #f8f9fa;
          font-weight: 700;
        }

        /* SWELL Box Styles */
        .swell-content .is-style-memo_box,
        .swell-content .swell-block-box[data-style="memo"] {
          padding: 1.25rem;
          margin: 1.5rem 0;
          background: #fff9db;
          border: 1px solid #ffd43b;
          border-radius: 4px;
        }

        .swell-content .is-style-alert_box,
        .swell-content .swell-block-box[data-style="alert"] {
          padding: 1.25rem;
          margin: 1.5rem 0;
          background: #fff5f5;
          border: 1px solid #ff6b6b;
          border-radius: 4px;
        }

        .swell-content .is-style-point_box,
        .swell-content .swell-block-box[data-style="point"] {
          padding: 1.25rem;
          margin: 1.5rem 0;
          background: #e7f5ff;
          border: 1px solid #339af0;
          border-radius: 4px;
        }

        .swell-content .is-style-check_box,
        .swell-content .swell-block-box[data-style="check"] {
          padding: 1.25rem;
          margin: 1.5rem 0;
          background: #ebfbee;
          border: 1px solid #40c057;
          border-radius: 4px;
        }

        .swell-content .is-style-simple_box,
        .swell-content .swell-block-box[data-style="simple"] {
          padding: 1.25rem;
          margin: 1.5rem 0;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 4px;
        }

        /* SWELL Balloon/Speech Bubble */
        .swell-content .swell-block-balloon {
          display: flex;
          gap: 1rem;
          margin: 1.5rem 0;
        }

        .swell-content .swell-block-balloon__icon {
          flex-shrink: 0;
        }

        .swell-content .swell-block-balloon__icon img {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
        }

        .swell-content .swell-block-balloon__body {
          position: relative;
          padding: 1rem;
          background: #f1f3f5;
          border-radius: 8px;
        }

        .swell-content .swell-block-balloon__body::before {
          content: '';
          position: absolute;
          left: -8px;
          top: 20px;
          border: 8px solid transparent;
          border-right-color: #f1f3f5;
        }

        /* SWELL FAQ Block */
        .swell-content .swell-block-faq {
          margin: 1.5rem 0;
        }

        .swell-content .swell-block-faq__q,
        .swell-content .swell-block-faq__a {
          display: flex;
          gap: 0.75rem;
          padding: 1rem;
        }

        .swell-content .swell-block-faq__q {
          background: #e7f5ff;
          border-radius: 4px 4px 0 0;
        }

        .swell-content .swell-block-faq__a {
          background: #f8f9fa;
          border-radius: 0 0 4px 4px;
        }

        .swell-content .swell-block-faq__q::before {
          content: 'Q';
          font-weight: 700;
          color: #339af0;
          font-size: 1.25rem;
        }

        .swell-content .swell-block-faq__a::before {
          content: 'A';
          font-weight: 700;
          color: #ff6b6b;
          font-size: 1.25rem;
        }

        /* SWELL Step Block */
        .swell-content .swell-block-step {
          margin: 1.5rem 0;
          counter-reset: step-counter;
        }

        .swell-content .swell-block-step__item {
          position: relative;
          padding-left: 3rem;
          padding-bottom: 1.5rem;
          border-left: 2px solid #dee2e6;
          margin-left: 1rem;
        }

        .swell-content .swell-block-step__item::before {
          counter-increment: step-counter;
          content: counter(step-counter);
          position: absolute;
          left: -1rem;
          top: 0;
          width: 2rem;
          height: 2rem;
          background: #667eea;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }

        /* Code blocks */
        .swell-content pre {
          background: #2d3748;
          color: #e2e8f0;
          padding: 1rem;
          border-radius: 4px;
          overflow-x: auto;
          margin: 1.5rem 0;
        }

        .swell-content code {
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
          font-size: 0.9em;
        }

        .swell-content p code {
          background: #f1f3f5;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          color: #e83e8c;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .swell-preview {
            color: #e2e8f0;
          }

          .swell-content h2 {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }

          .swell-content blockquote {
            background: #2d3748;
          }

          .swell-content th {
            background: #2d3748;
          }

          .swell-content .is-style-memo_box,
          .swell-content .swell-block-box[data-style="memo"] {
            background: #433d25;
            border-color: #b8860b;
          }

          .swell-content .is-style-alert_box,
          .swell-content .swell-block-box[data-style="alert"] {
            background: #3d2525;
            border-color: #dc3545;
          }

          .swell-content .is-style-point_box,
          .swell-content .swell-block-box[data-style="point"] {
            background: #253545;
            border-color: #339af0;
          }

          .swell-content .is-style-check_box,
          .swell-content .swell-block-box[data-style="check"] {
            background: #253d28;
            border-color: #40c057;
          }

          .swell-content .is-style-simple_box,
          .swell-content .swell-block-box[data-style="simple"] {
            background: #2d3748;
            border-color: #4a5568;
          }

          .swell-content p code {
            background: #2d3748;
          }
        }
      `}</style>
    </div>
  );
}
