export type EditorialAsset = {
  url: string;
  alt: string;
  credit: string;
  provenanceUrl: string;
  kind: 'photograph' | 'source-graphic';
  aiGenerated: false;
};

export const editorialAssets = {
  workerInspectingConstruction: {
    url: 'https://eoifovdmuuqdcospamru.supabase.co/storage/v1/object/public/photos/editorial/worker-construction.jpg',
    alt: 'A worker inspecting a construction site',
    credit:
      'Ryan Hagerty / U.S. Fish and Wildlife Service via Wikimedia Commons (public domain)',
    provenanceUrl:
      'https://commons.wikimedia.org/wiki/File:Worker_inspects_construction.jpg',
    kind: 'photograph',
    aiGenerated: false,
  },
  californiaPowerLines: {
    url: 'https://eoifovdmuuqdcospamru.supabase.co/storage/v1/object/public/photos/editorial/ca-power-lines.jpg',
    alt: 'High-voltage power lines running beside Interstate 15 in California',
    credit: 'Northwalker / Wikimedia Commons (CC0)',
    provenanceUrl:
      'https://commons.wikimedia.org/wiki/File:Path_27_Power_Lines_in_California_0.JPG',
    kind: 'photograph',
    aiGenerated: false,
  },
  californiaStateCapitol: {
    url: 'https://eoifovdmuuqdcospamru.supabase.co/storage/v1/object/public/photos/editorial/ca-state-capitol.jpg',
    alt: 'California State Capitol in Sacramento beneath a clear blue sky',
    credit: 'Earthquakesurprise / Wikimedia Commons (CC0)',
    provenanceUrl:
      'https://commons.wikimedia.org/wiki/File:CA_State_Capitol.png',
    kind: 'photograph',
    aiGenerated: false,
  },
  californiaCoast: {
    url: '/california-coast.jpg',
    alt: 'Aerial photograph of Santa Barbara, California, meeting the Pacific Ocean',
    credit: 'Clayton Cardinalli / Unsplash',
    provenanceUrl:
      'https://unsplash.com/photos/aerial-view-of-city-during-daytime-BTAU-92ZeZc',
    kind: 'photograph',
    aiGenerated: false,
  },
  lakeOroville: {
    url: '/oroville.jpg',
    alt: 'Aerial photograph of Lake Oroville and the surrounding California foothills',
    credit: 'Florence Low / California Department of Water Resources',
    provenanceUrl:
      'https://water.ca.gov/-/media/CWC-Website/Files/Documents/2023/2022_SWPAnnualReview_Final.pdf',
    kind: 'photograph',
    aiGenerated: false,
  },
  kyleLangfordPortrait: {
    url: '/kyle-langford.jpg',
    alt: 'Kyle Langford, publisher of The Golden Coast Journal',
    credit: 'Kyle Langford',
    provenanceUrl: 'https://www.goldencoastjournal.com/authors/kyle-langford',
    kind: 'photograph',
    aiGenerated: false,
  },
  californiaAiSafeguards: {
    url: '/ai-safeguards.png',
    alt: 'Official graphic announcing California artificial intelligence safeguards',
    credit: 'Office of the Governor of California',
    provenanceUrl: 'https://www.gov.ca.gov/newsroom/',
    kind: 'source-graphic',
    aiGenerated: false,
  },
} as const satisfies Record<string, EditorialAsset>;

/**
 * URLs retired from the registry that still appear on stored articles. They
 * resolve to the asset that replaced them so a row written before the swap
 * keeps its own photograph, alt text and credit instead of falling through to
 * the generic coast image under someone else's byline. Safe to delete once no
 * gcj_articles row references the key.
 */
const retiredAssetUrls: Record<string, EditorialAsset> = {
  'https://eoifovdmuuqdcospamru.supabase.co/storage/v1/object/public/photos/editorial/ca-state-capitol.jpg':
    editorialAssets.californiaStateCapitol,
};

const assetsByUrl = new Map<string, EditorialAsset>([
  ...Object.entries(retiredAssetUrls),
  ...Object.values(editorialAssets).map(
    (asset) => [asset.url, asset] as [string, EditorialAsset],
  ),
]);

export function getApprovedEditorialAsset(
  url: string | null | undefined,
): EditorialAsset {
  return (url && assetsByUrl.get(url)) || editorialAssets.californiaCoast;
}

export function editorialAssetLabel(asset: EditorialAsset) {
  return asset.kind === 'photograph' ? 'Photograph' : 'Source graphic';
}

/**
 * Resolve the image to render for a stored article.
 *
 * Imagery is validated when it is written: `gcj_editorial_assets` requires a
 * credit and a provenance URL and forbids AI-generated images at the database
 * level, so a stored image is already an approved one. Prefer the bundled entry
 * when the URL is one this build knows about, because that carries the asset's
 * `kind`; otherwise trust what the row stores. Only a row with no image at all
 * falls through to the registry default.
 */
export function editorialAssetForArticle(article: {
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageCredit?: string | null;
}): EditorialAsset {
  const bundled = article.imageUrl
    ? assetsByUrl.get(article.imageUrl)
    : undefined;
  if (bundled) return bundled;
  if (article.imageUrl && article.imageCredit) {
    return {
      url: article.imageUrl,
      alt: article.imageAlt || '',
      credit: article.imageCredit,
      provenanceUrl: '',
      kind: 'photograph',
      aiGenerated: false,
    };
  }
  return editorialAssets.californiaCoast;
}
