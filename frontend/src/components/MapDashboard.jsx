import React, { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { Layers, Eye, RefreshCw, MapPin } from 'lucide-react'

// Free ESRI Dark Gray Canvas tiles (No API key required, zero watermarks)
const ESRI_DARK_STYLE = {
  version: 8,
  sources: {
    'esri-dark': {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'
    },
    'esri-labels': {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256
    }
  },
  layers: [
    {
      id: 'esri-dark-tiles',
      type: 'raster',
      source: 'esri-dark',
      minzoom: 0,
      maxzoom: 19
    },
    {
      id: 'esri-labels-tiles',
      type: 'raster',
      source: 'esri-labels',
      minzoom: 0,
      maxzoom: 19
    }
  ]
}

const DELHI_CENTER = [77.228, 28.648]
const AMBULANCE_START = [77.2173768, 28.650752]
const HOSPITAL_LNJP = [77.2408713, 28.6364948]

export default function MapDashboard({ routeData, places }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [showFlood, setShowFlood] = useState(true)

  useEffect(() => {
    if (map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: ESRI_DARK_STYLE,
      center: DELHI_CENTER,
      zoom: 12.8,
      pitch: 0,
      bearing: 0,
    })

    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.current.on('load', () => {
      setMapLoaded(true)

      // 1. Flood Extent Layer (Blue fill with Cyan edge #00D4FF)
      map.current.addSource('flood-extent', {
        type: 'geojson',
        data: '/data/flood_extent.geojson',
      })

      map.current.addLayer({
        id: 'flood-fill',
        type: 'fill',
        source: 'flood-extent',
        paint: {
          'fill-color': '#0284C7',
          'fill-opacity': 0.45,
        },
      })

      map.current.addLayer({
        id: 'flood-outline',
        type: 'line',
        source: 'flood-extent',
        paint: {
          'line-color': '#00D4FF',
          'line-width': 1.5,
          'line-opacity': 0.85,
        },
      })

      // 2. Scored Road Segments
      fetch('/data/demo_segments.json')
        .then((r) => r.json())
        .then((data) => {
          if (!map.current) return
          const features = []
          const cands = data?.allow_candidates || []
          for (const c of cands) {
            if (c.geometry && c.geometry.length >= 2) {
              features.push({
                type: 'Feature',
                properties: {
                  prob: c.flood_probability,
                  name: c.display_name
                },
                geometry: {
                  type: 'LineString',
                  coordinates: c.geometry
                }
              })
            }
          }

          if (features.length > 0 && !map.current.getSource('road-segments')) {
            map.current.addSource('road-segments', {
              type: 'geojson',
              data: { type: 'FeatureCollection', features }
            })

            map.current.addLayer({
              id: 'road-segments-layer',
              type: 'line',
              source: 'road-segments',
              paint: {
                'line-color': [
                  'step',
                  ['get', 'prob'],
                  '#00E5B0',
                  0.4, '#FFB347',
                  0.7, '#FF4560'
                ],
                'line-width': 3.5,
                'line-opacity': 0.75
              }
            })
          }
        })
        .catch(() => {})

      // 3. Markers for Origin and Hospital
      const ambEl = document.createElement('div')
      ambEl.className = 'w-4 h-4 rounded-full bg-amber-400 border-2 border-white shadow-[0_0_10px_#F59E0B] cursor-pointer animate-pulse'
      new maplibregl.Marker({ element: ambEl })
        .setLngLat(AMBULANCE_START)
        .setPopup(new maplibregl.Popup({ offset: 10 }).setHTML(
          '<div style="font-family:Inter Tight,sans-serif;font-size:12px;color:#05090D;padding:2px;">' +
          '<strong>Ambulance 4 Start</strong><br>Near Qutab Road (Node 6720363005)</div>'
        ))
        .addTo(map.current)

      const hospEl = document.createElement('div')
      hospEl.className = 'w-4 h-4 rounded-full bg-emerald-400 border-2 border-white shadow-[0_0_10px_#10B981] cursor-pointer'
      new maplibregl.Marker({ element: hospEl })
        .setLngLat(HOSPITAL_LNJP)
        .setPopup(new maplibregl.Popup({ offset: 10 }).setHTML(
          '<div style="font-family:Inter Tight,sans-serif;font-size:12px;color:#05090D;padding:2px;">' +
          '<strong>Lok Nayak Hospital (LNJP)</strong><br>Destination (Node 458640629)</div>'
        ))
        .addTo(map.current)
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // When routeData arrives, update layers and fitBounds
  useEffect(() => {
    if (!map.current || !mapLoaded || !routeData) return

    const defaultCoords = routeData.default_route?.coords || []
    const safeCoords = routeData.safe_route?.coords || []

    const defaultGeo = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: defaultCoords.map(([lat, lon]) => [lon, lat])
      }
    }

    const safeGeo = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: safeCoords.map(([lat, lon]) => [lon, lat])
      }
    }

    // Unconstrained route as faint rose dashed line
    if (map.current.getSource('default-route')) {
      map.current.getSource('default-route').setData(defaultGeo)
    } else if (defaultCoords.length > 0) {
      map.current.addSource('default-route', { type: 'geojson', data: defaultGeo })
      map.current.addLayer({
        id: 'default-route-layer',
        type: 'line',
        source: 'default-route',
        paint: {
          'line-color': '#FF4560',
          'line-width': 2.5,
          'line-dasharray': [2, 2],
          'line-opacity': 0.5
        }
      })
    }

    // Safe route as vibrant radar mint line
    if (map.current.getSource('safe-route')) {
      map.current.getSource('safe-route').setData(safeGeo)
    } else if (safeCoords.length > 0) {
      map.current.addSource('safe-route', { type: 'geojson', data: safeGeo })
      map.current.addLayer({
        id: 'safe-route-layer',
        type: 'line',
        source: 'safe-route',
        paint: {
          'line-color': '#00E5B0',
          'line-width': 4.5,
          'line-dasharray': [1.5, 1],
          'line-opacity': 0.95
        }
      })
    }

    // fitBounds around safe route
    if (safeCoords.length > 0) {
      const bounds = new maplibregl.LngLatBounds()
      safeCoords.forEach(([lat, lon]) => bounds.extend([lon, lat]))
      defaultCoords.forEach(([lat, lon]) => bounds.extend([lon, lat]))

      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 14.5,
        duration: 1400
      })
    }
  }, [routeData, mapLoaded])

  // Toggle Flood extent
  const toggleFlood = () => {
    if (!map.current) return
    const next = !showFlood
    setShowFlood(next)
    const val = next ? 'visible' : 'none'
    if (map.current.getLayer('flood-fill')) map.current.setLayoutProperty('flood-fill', 'visibility', val)
    if (map.current.getLayer('flood-outline')) map.current.setLayoutProperty('flood-outline', 'visibility', val)
  }

  const handleResetCamera = () => {
    if (!map.current) return
    map.current.flyTo({
      center: DELHI_CENTER,
      zoom: 12.8,
      duration: 1200
    })
  }

  return (
    <div className="relative w-full h-[580px] rounded-[22px] overflow-hidden bg-[#070D14] border border-white/[0.08] shadow-2xl">
      
      {/* MapLibre Canvas Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Top Left Floating Map Controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <button
          onClick={toggleFlood}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all backdrop-blur-md border ${
            showFlood
              ? 'bg-[#070D14]/95 border-cyan-500/40 text-cyan-400 shadow-md'
              : 'bg-[#070D14]/80 border-white/10 text-zinc-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Flood extent</span>
        </button>

        <button
          onClick={handleResetCamera}
          className="p-2 rounded-full bg-[#070D14]/90 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition-all backdrop-blur-md shadow-md"
          title="Reset View"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Small Clean Legend */}
      <div className="absolute bottom-4 right-4 z-10 p-3.5 rounded-2xl bg-[#070D14]/95 backdrop-blur-md border border-white/10 text-[11px] font-mono space-y-2 shadow-xl">
        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-white/[0.08] pb-1.5">
          Map Radar Legend
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1.5 rounded-full bg-[#00E5B0]" />
          <span className="text-zinc-200">Safe corridor (detour)</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3.5 h-0.5 border-t border-dashed border-[#FF4560]" />
          <span className="text-zinc-400">Flooded default path</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3.5 h-2.5 rounded bg-[#0284C7]/60 border border-[#00D4FF]" />
          <span className="text-zinc-400">Sentinel-1 water mask</span>
        </div>

        <div className="flex items-center gap-2 pt-1.5 border-t border-white/[0.08] text-[10px] text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Ambulance 4 → LNJP</span>
        </div>
      </div>

    </div>
  )
}
