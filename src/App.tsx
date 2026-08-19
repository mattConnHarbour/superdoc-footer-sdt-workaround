import { useRef, useState } from 'react';
import { SuperDocEditor } from '@superdoc-dev/react';
import type { SuperDocRef } from '@superdoc-dev/react';
import { superdocFonts } from '@superdoc-dev/fonts';
import '@superdoc-dev/react/style.css';
import './App.css';
import { cloneFooter, FOOTER_PLACEHOLDER, replaceFooterContent } from './footer-helpers';
import type { ReplacementKind } from './footer-helpers';

type Status = { kind: 'idle' | 'success' | 'error'; message: string };

export default function App() {
  const editorRef = useRef<SuperDocRef>(null);
  const [ready, setReady] = useState(false);
  const [initials, setInitials] = useState('SD');
  const [status, setStatus] = useState<Status>({ kind: 'idle', message: 'Loading…' });

  // =============================================================================
  // Clones the shared footer and replaces [user_initials] with a text or image SDT.
  // Preserves the footer's formatting while replacing its placeholder structurally.
  // =============================================================================
  const replaceFooter = async (kind: ReplacementKind) => {
    try {
      const documentApi = editorRef.current!.getInstance()!.activeEditor!.doc!;
      const value = initials.trim();
      const footer = await cloneFooter(documentApi);
      await replaceFooterContent(documentApi, footer, kind, value);

      setStatus({ kind: 'success', message: `Created cloned footer with ${kind} SDT content.` });
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <div className="app-shell">
      <header className="controls">
        <div><h1>Footer SDT replacement</h1><p>Client-side Document API example</p></div>
        <label>Seller initials<input value={initials} onChange={(event) => setInitials(event.target.value)} /></label>
        <fieldset className="replacement-group">
          <legend>Footer placeholder</legend>
          <div className="replacement-actions">
            <button className="primary" onClick={() => replaceFooter('image')} disabled={!ready}>Replace with image</button>
            <button onClick={() => replaceFooter('text')} disabled={!ready}>Replace with text</button>
          </div>
        </fieldset>
        <button onClick={() => editorRef.current?.getInstance()?.export({ triggerDownload: true })} disabled={!ready}>Export DOCX</button>
        <span className={`status ${status.kind}`} role="status">{status.message}</span>
      </header>
      <main className="editor-surface">
        <SuperDocEditor
          ref={editorRef}
          document="/seller-initials-template.docx"
          fonts={{ ...superdocFonts }}
          documentMode="editing"
          role="editor"
          user={{ name: 'Demo User', email: 'demo@example.com' }}
          onReady={() => { setReady(true); setStatus({ kind: 'idle', message: `Ready: ${FOOTER_PLACEHOLDER}` }); }}
          onContentError={(event) => setStatus({ kind: 'error', message: String(event) })}
          style={{ height: '100%' }}
        />
      </main>
    </div>
  );
}
