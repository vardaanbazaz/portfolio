import { useRef, useState } from 'react';
import { content } from '../content/pages/contact';
import { PAGE_LABELS } from '../content/scene';
import { UI } from '../ui/strings';
import type { PageProps } from './contract';
import { copyText, type CopyState } from './copyText';
import { LinkList } from './LinkList';

export default function ContactPage({ headingId }: PageProps) {
  const emailRef = useRef<HTMLParagraphElement>(null);
  const [copy, setCopy] = useState<CopyState>('idle');

  const onCopy = async () => setCopy(await copyText(content.email, emailRef.current));

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

      <p className="muted">{content.privacy}</p>
    </article>
  );
}
