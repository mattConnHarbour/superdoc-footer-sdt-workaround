import type { SuperDocInstance } from '@superdoc-dev/react';

export const FOOTER_PLACEHOLDER = '[user_initials]';

export type ReplacementKind = 'image' | 'text';

type DocumentApi = NonNullable<NonNullable<SuperDocInstance['activeEditor']>['doc']>;

const imageDataUri = async () => {
  const blob = await fetch('/seller-initials.png').then((response) => response.blob());
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
};

export const cloneFooter = async (documentApi: DocumentApi) => {
  const headerFooters = documentApi.headerFooters;
  const footerParts = headerFooters.parts;
  const footerRefs = headerFooters.refs;
  const section = (await documentApi.sections.list({})).items[0]!;
  const slot = {
    kind: 'headerFooterSlot' as const,
    section: section.address,
    headerFooterKind: 'footer' as const,
    variant: 'default' as const,
  };
  const resolved = await headerFooters.resolve({ target: slot });
  const resolvedFooter = resolved as Exclude<typeof resolved, { status: 'none' }>;
  const clone = await footerParts.create({ kind: 'footer', sourceRefId: resolvedFooter.refId });
  const clonedFooter = clone as Extract<typeof clone, { success: true }>;

  await footerRefs.set({ target: slot, refId: clonedFooter.refId });

  return {
    kind: 'story' as const,
    storyType: 'headerFooterPart' as const,
    refId: clonedFooter.refId,
  };
};

const createSdtContent = async (kind: ReplacementKind, value: string) => kind === 'image'
  ? [{
      kind: 'image' as const,
      image: {
        src: await imageDataUri(),
        alt: `Seller initials: ${value}`,
        geometry: { width: 90, height: 60 },
      },
    }]
  : [{ kind: 'run' as const, run: { text: value } }];

const updateFooterInlines = (
  node: Extract<Awaited<ReturnType<DocumentApi['getNode']>>['node'], { kind: 'paragraph' }>,
  sdtContent: Awaited<ReturnType<typeof createSdtContent>>,
) => {
  let replaced = false;

  return node.paragraph.inlines.flatMap((inline: (typeof node.paragraph.inlines)[number]) => {
    if (replaced || inline.kind !== 'run' || !inline.run.text.includes(FOOTER_PLACEHOLDER)) return [inline];

    const offset = inline.run.text.indexOf(FOOTER_PLACEHOLDER);
    const before = inline.run.text.slice(0, offset);
    const after = inline.run.text.slice(offset + FOOTER_PLACEHOLDER.length);
    replaced = true;

    return [
      ...(before ? [{ ...inline, run: { ...inline.run, text: before } }] : []),
      {
        kind: 'sdt' as const,
        sdt: {
          scope: 'inline' as const,
          type: 'richText',
          tag: 'user_initials',
          alias: 'Seller initials',
          inlines: sdtContent,
        },
      },
      ...(after ? [{ ...inline, run: { ...inline.run, text: after } }] : []),
    ];
  });
};

export const replaceFooterContent = async (
  documentApi: DocumentApi,
  footer: Awaited<ReturnType<typeof cloneFooter>>,
  kind: ReplacementKind,
  value: string,
) => {
  const match = (await documentApi.query.match({
    select: { type: 'text', pattern: FOOTER_PLACEHOLDER, mode: 'contains' },
    require: 'first',
    in: footer,
  })).items![0]!;
  const nodeResult = await documentApi.getNode(match.address);
  const node = nodeResult.node as Extract<typeof nodeResult.node, { kind: 'paragraph' }>;
  const sdtContent = await createSdtContent(kind, value);
  const inlines = updateFooterInlines(node, sdtContent);

  await documentApi.replace({
    target: nodeResult.address as Extract<typeof nodeResult.address, { kind: 'block' }>,
    in: footer,
    content: { kind: 'paragraph', paragraph: { ...node.paragraph, inlines } },
  });
};
