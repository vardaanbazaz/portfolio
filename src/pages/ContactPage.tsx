import { useRef, useState } from 'react';
import { content } from '../content/pages/contact';
import { PAGE_LABELS } from '../content/scene';
import { UI } from '../ui/strings';
import type { PageProps } from './contract';
import { LinkList } from './LinkList';

type CopyState = 'idle' | 'copied' | 'failed';

/** Selects the address so it can be copied by hand when the clipboard API is missing or refused. */
function selectText(node: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
}

export default function ContactPage({ headingId }: PageProps) {
  const emailRef = useRef<HTMLParagraphElement>(null);
  const [copy, setCopy] = useState<CopyState>('idle');

  const onCopy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(content.email);
      setCopy('copied');
    } catch {
      if (emailRef.current) selectText(emailRef.current);
      setCopy('failed');
    }
  };

  return (
    <article>
      <h1 id={headingId} tabIndex={-1}>
        {PAGE_LABELS.contact}
      </h1>
      <p>{content.availability}</p>

      <section>
        <h2>{UI.email}</h2>
        <p ref={emailRef} className="contact-email">
          {content.email}
        </p>
        <div className="contact-actions">
          <button type="button" onClick={onCopy}>
            {UI.copyEmail}
          </button>
          <a href={`mailto:${content.email}`}>{UI.mailApp}</a>
        </div>
        <p role="status" className="muted">
          {copy === 'copied' ? UI.copied : copy === 'failed' ? UI.copyFailed : ''}
        </p>
      </section>

      <section>
        <h2>{UI.links}</h2>
        <LinkList links={content.links} />
      </section>
    </article>
  );
}
