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
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/Worker_inspects_construction.jpg/1280px-Worker_inspects_construction.jpg?utm_campaign=index&utm_content=thumbnail&utm_source=commons.wikimedia.org',
    alt: 'A worker inspecting a construction site',
    credit:
      'Ryan Hagerty / U.S. Fish and Wildlife Service via Wikimedia Commons (public domain)',
    provenanceUrl:
      'https://commons.wikimedia.org/wiki/File:Worker_inspects_construction.jpg',
    kind: 'photograph',
    aiGenerated: false,
  },
  californiaPowerLines: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/Path_27_Power_Lines_in_California_0.JPG/1280px-Path_27_Power_Lines_in_California_0.JPG?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail',
    alt: 'High-voltage power lines running beside Interstate 15 in California',
    credit: 'Northwalker / Wikimedia Commons (CC0)',
    provenanceUrl:
      'https://commons.wikimedia.org/wiki/File:Path_27_Power_Lines_in_California_0.JPG',
    kind: 'photograph',
    aiGenerated: false,
  },
  californiaStateCapitol: {
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7e/CA_State_Capitol.png/1920px-CA_State_Capitol.png.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
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
  'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7e/CA_State_Capitol.png/1920px-CA_State_Capitol.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail':
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
