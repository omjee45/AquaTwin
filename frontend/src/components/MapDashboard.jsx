import React, { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { Layers, RefreshCw } from 'lucide-react'

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

      // 1. Flood Extent Layer (Blue fill with Cyan edge #22D3EE)
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
          'line-color': '#22D3EE',
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
                  '#34D399',
                  0.4, '#F59E0B',
                  0.7, '#F43F5E'
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
      ambEl.className = 'w-4 h-4 rounded-full bg-[#F59E0B] border-2 border-white shadow-[0_0_12px_#F59E0B] cursor-pointer animate-pulse'
      new maplibregl.Marker({ element: ambEl })
        .setLngLat(AMBULANCE_START)
        .setPopup(new maplibregl.Popup({ offset: 10 }).setHTML(
          '<div style="font-family:Inter,sans-serif;font-size:12px;color:#02060F;padding:2px;">' +
          '<strong>Ambulance 4 Start</strong><br>Near Qutab Road (Node 6720363005)</div>'
        ))
        .addTo(map.current)

      const hospEl = document.createElement('div')
      hospEl.className = 'w-4 h-4 rounded-full bg-[#34D399] border-2 border-white shadow-[0_0_12px_#34D399] cursor-pointer'
      new maplibregl.Marker({ element: hospEl })
        .setLngLat(HOSPITAL_LNJP)
        .setPopup(new maplibregl.Popup({ offset: 10 }).setHTML(
          '<div style="font-family:Inter,sans-serif;font-size:12px;color:#02060F;padding:2px;">' +
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
          'line-color': '#F43F5E',
          'line-width': 2.5,
          'line-dasharray': [2, 2],
          'line-opacity': 0.5
        }
      })
    }

    // Safe route as vibrant green line
    if (map.current.getSource('safe-route')) {
      map.current.getSource('safe-route').setData(safeGeo)
    } else if (safeCoords.length > 0) {
      map.current.addSource('safe-route', { type: 'geojson', data: safeGeo })
      map.current.addLayer({
        id: 'safe-route-layer',
        type: 'line',
        source: 'safe-route',
        paint: {
          'line-color': '#34D399',
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
    <div className="glass-card relative w-full h-[580px] overflow-hidden">
      
      {/* MapLibre Canvas Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Top Left Floating Map Controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <button
          onClick={toggleFlood}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all backdrop-blur-md border ${
            showFlood
              ? 'bg-[#02060F]/90 border-blue-400/40 text-[#5AA9FF] shadow-[0_0_12px_rgba(59,130,246,0.2)]'
              : 'bg-[#02060F]/70 border-blue-500/20 text-[#8EA0C4] hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Flood extent</span>
        </button>

        <button
          onClick={handleResetCamera}
          className="p-2 rounded-lg bg-[#02060F]/80 border border-blue-500/20 hover:border-blue-400/40 text-[#8EA0C4] hover:text-white transition-all backdrop-blur-md shadow-md"
          title="Reset View"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10 p-3.5 rounded-xl bg-[#02060F]/90 backdrop-blur-md border border-blue-500/20 text-[11px] font-mono space-y-2 shadow-xl">
        <div className="text-[10px] font-semibold text-[#8EA0C4] uppercase tracking-wider border-b border-blue-500/15 pb-1.5">
          Map Legend
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1.5 rounded-full bg-[#34D399]" />
          <span className="text-zinc-200">Safe corridor (detour)</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3.5 h-0.5 border-t border-dashed border-[#F43F5E]" />
          <span className="text-[#8EA0C4]">Flooded default path</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3.5 h-2.5 rounded bg-[#0284C7]/60 border border-[#22D3EE]" />
          <span className="text-[#8EA0C4]">Sentinel-1 water mask</span>
        </div>

        <div className="flex items-center gap-2 pt-1.5 border-t border-blue-500/15 text-[10px] text-[#8EA0C4]">
          <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
          <span>Ambulance 4 → LNJP</span>
        </div>
      </div>

    </div>
  )
}
