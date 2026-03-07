'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Bird } from '@/lib/supabase/types'
import { fetchBirdImageFromWikipedia } from '@/lib/images/storage'
import BirdDetailModal from './BirdDetailModal'

type Filter = 'all' | 'easy' | 'common' | 'failed' | 'flagged'
type ImageStatus = 'loading' | 'loaded' | 'failed'

interface ImageData {
  url: string | null
  source: 'wikipedia' | 'commons' | 'override' | 'failed'
  status: ImageStatus
}

// Image overrides from legacy data
const IMAGE_OVERRIDES: Record<string, string> = {
  'Coccothraustes coccothraustes': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Coccothraustes_coccothraustes_-_01.jpg/800px-Coccothraustes_coccothraustes_-_01.jpg',
  'Sturnus vulgaris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Sturnus_vulgaris_-California-8.jpg/800px-Sturnus_vulgaris_-California-8.jpg',
  'Spinus spinus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Erlenzeisig_Spinus_spinus_male.jpg/800px-Erlenzeisig_Spinus_spinus_male.jpg',
  'Branta leucopsis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Barnacle_goose_%28Branta_leucopsis%29.jpg/800px-Barnacle_goose_%28Branta_leucopsis%29.jpg',
  'Mergellus albellus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Male_of_Mergellus_albellus_%28male_s2%29.jpg/800px-Male_of_Mergellus_albellus_%28male_s2%29.jpg',
  'Botaurus stellaris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Bittern_-_Botaurus_stellaris.jpg/800px-Bittern_-_Botaurus_stellaris.jpg',
  'Ardea cinerea': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Ardea_cinerea_Luc_Viatour.jpg/800px-Ardea_cinerea_Luc_Viatour.jpg',
  'Buteo buteo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Steppe_buzzard_%28Buteo_buteo_vulpinus%29.jpg/800px-Steppe_buzzard_%28Buteo_buteo_vulpinus%29.jpg',
  'Accipiter nisus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Eurasian_sparrowhawk_%28Accipiter_nisus_nisus%29_male.jpg/800px-Eurasian_sparrowhawk_%28Accipiter_nisus_nisus%29_male.jpg',
  'Buteo lagopus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Buteo_lagopus_29283.JPG/800px-Buteo_lagopus_29283.JPG',
  'Circus aeruginosus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Marsh_harrier_%28Circus_aeruginosus%29_male_Danube_delta.jpg/800px-Marsh_harrier_%28Circus_aeruginosus%29_male_Danube_delta.jpg',
  'Milvus milvus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Rotmilan_IMG_7373.jpg/800px-Rotmilan_IMG_7373.jpg',
  'Milvus migrans': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Milvus_migrans_qtl1.jpg/800px-Milvus_migrans_qtl1.jpg',
  'Pernis apivorus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Wespenbussard_European_honey_buzzard_Pernis_apivorus%2C_crop.jpg/800px-Wespenbussard_European_honey_buzzard_Pernis_apivorus%2C_crop.jpg',
  'Aquila chrysaetos': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Aquila_chrysaetos_qtl1.jpg/800px-Aquila_chrysaetos_qtl1.jpg',
  'Strix aluco': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Tawny_wiki_edit1.jpg/800px-Tawny_wiki_edit1.jpg',
  'Asio otus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Long-eared_owl_%28Asio_otus%29.jpg/800px-Long-eared_owl_%28Asio_otus%29.jpg',
  'Asio flammeus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Asio-flammeus-001.jpg/800px-Asio-flammeus-001.jpg',
  'Fratercula arctica': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Puffin_%28Fratercula_arctica%29.jpg/800px-Puffin_%28Fratercula_arctica%29.jpg',
  'Gulosus aristotelis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Phalacrocorax_aristotelis_desmarestii.jpg/800px-Phalacrocorax_aristotelis_desmarestii.jpg',
  'Scolopax rusticola': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Waldschnepfe_%28scolopax_rusticola%29_-_Spiekeroog%2C_Nationalpark_Nieders%C3%A4chsisches_Wattenmeer.jpg/800px-Waldschnepfe_%28scolopax_rusticola%29_-_Spiekeroog%2C_Nationalpark_Nieders%C3%A4chsisches_Wattenmeer.jpg',
  'Dendrocopos major': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/2015.05.08.-04-Kaefertaler_Wald-Mannheim--Buntspecht-Weibchen.jpg/800px-2015.05.08.-04-Kaefertaler_Wald-Mannheim--Buntspecht-Weibchen.jpg',
  'Picus viridis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/European_green_woodpecker_%28Picus_viridis%29_male.JPG/800px-European_green_woodpecker_%28Picus_viridis%29_male.JPG',
  'Dryocopus martius': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Black_woodpecker_%28Dryocopus_martius%29.jpg/800px-Black_woodpecker_%28Dryocopus_martius%29.jpg',
  'Certhia familiaris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/%D0%9E%D0%B1%D1%8B%D0%BA%D0%BD%D0%BE%D0%B2%D0%B5%D0%BD%D0%BD%D0%B0%D1%8F_%D0%BF%D0%B8%D1%89%D1%83%D1%85%D0%B0_%28Certhia_familiaris%29.jpg/800px-%D0%9E%D0%B1%D1%8B%D0%BA%D0%BD%D0%BE%D0%B2%D0%B5%D0%BD%D0%BD%D0%B0%D1%8F_%D0%BF%D0%B8%D1%89%D1%83%D1%85%D0%B0_%28Certhia_familiaris%29.jpg',
  'Certhia brachydactyla': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Short-toed_treecreeper_%28Certhia_brachydactyla_megarhynchos%29.jpg/800px-Short-toed_treecreeper_%28Certhia_brachydactyla_megarhynchos%29.jpg',
  'Turdus pilaris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Fieldfare_aka_Turdus_pilaris.jpg/800px-Fieldfare_aka_Turdus_pilaris.jpg',
  'Apus apus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Apus_apus_-Barcelona%2C_Spain-8_%281%29.jpg/800px-Apus_apus_-Barcelona%2C_Spain-8_%281%29.jpg',
  'Anthus trivialis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Tree_pipit_%28Anthus_trivialis%29.jpg/800px-Tree_pipit_%28Anthus_trivialis%29.jpg',
  'Ficedula hypoleuca': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/European_Pied_Flycatcher_-_Ficedula_hypoleuca_-_Male.jpg/800px-European_Pied_Flycatcher_-_Ficedula_hypoleuca_-_Male.jpg',
  'Acrocephalus scirpaceus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Teichrohrs%C3%A4nger_%28Acrocephalus_scirpaceus%29_02.jpg/800px-Teichrohrs%C3%A4nger_%28Acrocephalus_scirpaceus%29_02.jpg',
  'Acrocephalus arundinaceus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Great_reed_warbler_%28Acrocephalus_arundinaceus%29.jpg/800px-Great_reed_warbler_%28Acrocephalus_arundinaceus%29.jpg',
  'Luscinia luscinia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Luscinia_luscinia_vogelartinfo_chris_romeiks_CHR3635.jpg/800px-Luscinia_luscinia_vogelartinfo_chris_romeiks_CHR3635.jpg',
  'Phoenicurus phoenicurus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Phoenicurus_phoenicurus_08%28js%29%2C_Lodz_%28Poland%29.jpg/800px-Phoenicurus_phoenicurus_08%28js%29%2C_Lodz_%28Poland%29.jpg',
  'Ciconia ciconia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/White_Stork.jpg/800px-White_Stork.jpg',
  'Jynx torquilla': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Wryneck_by_Pepe_Reigada.jpg/800px-Wryneck_by_Pepe_Reigada.jpg',
  'Perdix perdix': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Grey_Partridge_Perdix_perdix%2C_Netherlands_1.jpg/800px-Grey_Partridge_Perdix_perdix%2C_Netherlands_1.jpg',
  'Coturnix coturnix': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Coturnix_coturnix%2C_Fraunberg%2C_Bayern%2C_Deutschland_1%2C_Ausschnitt.jpg/800px-Coturnix_coturnix%2C_Fraunberg%2C_Bayern%2C_Deutschland_1%2C_Ausschnitt.jpg',
  'Pastor roseus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Rosy_starling_%28Pastor_roseus%29.jpg/800px-Rosy_starling_%28Pastor_roseus%29.jpg',
}

const FLAG_KEY = 'bird_admin_flags'

function loadFlags(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    return new Set(JSON.parse(localStorage.getItem(FLAG_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function saveFlags(flags: Set<string>) {
  localStorage.setItem(FLAG_KEY, JSON.stringify([...flags]))
}

export default function BirdGrid({ birds }: { birds: Bird[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [imageData, setImageData] = useState<Map<string, ImageData>>(new Map())
  const [flagged, setFlagged] = useState<Set<string>>(new Set())
  const [selectedBird, setSelectedBird] = useState<Bird | null>(null)
  const [loadedCount, setLoadedCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)

  // Load flags from localStorage
  useEffect(() => {
    setFlagged(loadFlags())
  }, [])

  // Load images progressively (6 concurrent)
  useEffect(() => {
    let cancelled = false
    let idx = 0
    let loaded = 0
    let failed = 0

    async function loadNext() {
      while (idx < birds.length && !cancelled) {
        const i = idx++
        const bird = birds[i]
        const sci = bird.scientific_name

        // Check override first
        if (IMAGE_OVERRIDES[sci]) {
          const data: ImageData = { url: IMAGE_OVERRIDES[sci], source: 'override', status: 'loaded' }
          setImageData(prev => new Map(prev).set(bird.id, data))
          loaded++
          setLoadedCount(loaded)
          continue
        }

        // Fetch from Wikipedia/Commons
        try {
          const url = await fetchBirdImageFromWikipedia(sci)
          if (cancelled) return
          if (url) {
            setImageData(prev => new Map(prev).set(bird.id, {
              url,
              source: url.includes('wikipedia.org/wiki') ? 'wikipedia' : 'commons',
              status: 'loaded',
            }))
          } else {
            setImageData(prev => new Map(prev).set(bird.id, { url: null, source: 'failed', status: 'failed' }))
            failed++
            setFailedCount(failed)
          }
        } catch {
          if (cancelled) return
          setImageData(prev => new Map(prev).set(bird.id, { url: null, source: 'failed', status: 'failed' }))
          failed++
          setFailedCount(failed)
        }
        loaded++
        setLoadedCount(loaded)
      }
    }

    const workers = Array.from({ length: 6 }, () => loadNext())
    Promise.all(workers)

    return () => { cancelled = true }
  }, [birds])

  const toggleFlag = useCallback((birdId: string) => {
    setFlagged(prev => {
      const next = new Set(prev)
      const sci = birds.find(b => b.id === birdId)?.scientific_name
      if (!sci) return prev
      if (next.has(sci)) next.delete(sci)
      else next.add(sci)
      saveFlags(next)
      return next
    })
  }, [birds])

  // Filter birds
  const filtered = birds.filter(bird => {
    if (search) {
      const q = search.toLowerCase()
      if (
        !bird.name_da.toLowerCase().includes(q) &&
        !bird.name_en.toLowerCase().includes(q) &&
        !bird.scientific_name.toLowerCase().includes(q)
      ) return false
    }
    switch (filter) {
      case 'easy': return bird.is_easy
      case 'common': return bird.is_common
      case 'failed': return imageData.get(bird.id)?.status === 'failed'
      case 'flagged': return flagged.has(bird.scientific_name)
      default: return true
    }
  })

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'Alle', count: birds.length },
    { key: 'easy', label: 'Lette', count: birds.filter(b => b.is_easy).length },
    { key: 'common', label: 'Almindelige', count: birds.filter(b => b.is_common).length },
    { key: 'failed', label: 'Fejlede', count: failedCount },
    { key: 'flagged', label: 'Markerede', count: flagged.size },
  ]

  return (
    <>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Søg fugle..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 rounded-lg text-sm outline-none"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            style={{
              background: filter === f.key
                ? (f.key === 'flagged' ? 'rgba(248,113,113,0.15)' : 'var(--accent-glow)')
                : 'var(--bg-card)',
              border: `1px solid ${filter === f.key
                ? (f.key === 'flagged' ? '#f87171' : 'var(--accent-dim)')
                : 'var(--border)'}`,
              color: filter === f.key
                ? (f.key === 'flagged' ? '#f87171' : 'var(--accent)')
                : 'var(--text-secondary)',
            }}
          >
            {f.label} <span style={{ opacity: 0.7 }}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        {loadedCount < birds.length
          ? `Henter billeder... ${loadedCount} / ${birds.length}`
          : `Alle ${birds.length} billeder hentet`}
        {failedCount > 0 && ` (${failedCount} fejlede)`}
      </div>

      {/* Grid */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {filtered.map(bird => {
          const img = imageData.get(bird.id)
          const isFlagged = flagged.has(bird.scientific_name)
          return (
            <div
              key={bird.id}
              onClick={() => setSelectedBird(bird)}
              className="rounded-xl overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5"
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${img?.status === 'failed' ? '#f87171' : isFlagged ? '#fbbf24' : 'var(--border)'}`,
              }}
            >
              {/* Image */}
              <div className="relative" style={{ aspectRatio: '4/3', background: 'var(--bg-secondary)' }}>
                {img?.url ? (
                  <img
                    src={img.url}
                    alt={bird.name_da}
                    className="w-full h-full object-cover object-center"
                  />
                ) : img?.status === 'failed' ? (
                  <div className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: '#f87171' }}>
                    Intet foto
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="spinner" />
                  </div>
                )}
                {/* Source badge */}
                {img && (
                  <div
                    className="absolute bottom-1 left-1 text-[0.6rem] px-1.5 py-0.5 rounded"
                    style={{
                      background: 'rgba(0,0,0,0.7)',
                      color: img.source === 'wikipedia' ? '#8bc7f0'
                        : img.source === 'override' ? '#4ade80'
                        : img.source === 'failed' ? '#f87171'
                        : '#fbbf24',
                    }}
                  >
                    {img.source === 'wikipedia' ? 'WP' : img.source === 'override' ? 'OV' : img.source === 'failed' ? 'FEJL' : 'CM'}
                  </div>
                )}
                {/* Flag indicator */}
                {isFlagged && (
                  <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full" style={{ background: '#fbbf24' }} />
                )}
              </div>
              {/* Info */}
              <div className="p-2.5">
                <div className="font-semibold text-[0.85rem]" style={{ color: 'var(--text-primary)' }}>{bird.name_da}</div>
                <div className="text-[0.72rem]" style={{ color: 'var(--text-muted)' }}>{bird.name_en}</div>
                <div className="text-[0.68rem] italic mt-0.5" style={{ color: '#4a6b5a' }}>{bird.scientific_name}</div>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {bird.is_easy && (
                    <span className="text-[0.6rem] px-1.5 py-0.5 rounded" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>let</span>
                  )}
                  {bird.is_common && (
                    <span className="text-[0.6rem] px-1.5 py-0.5 rounded" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>alm.</span>
                  )}
                  <span className="text-[0.6rem] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    {bird.category}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail modal */}
      {selectedBird && (
        <BirdDetailModal
          bird={selectedBird}
          imageData={imageData.get(selectedBird.id) || null}
          isFlagged={flagged.has(selectedBird.scientific_name)}
          onToggleFlag={() => toggleFlag(selectedBird.id)}
          onClose={() => setSelectedBird(null)}
        />
      )}
    </>
  )
}
