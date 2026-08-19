'use client'
import { useState, useRef } from 'react'
import styles from './dashboard.module.css'

export default function MenuScanner({ storeId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [editingIdx, setEditingIdx] = useState(null)
  const fileRef = useRef()

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setLoading(true)
    setError('')
    setItems([])

    try {
      const fd = new FormData()
      fd.append('menu', file)
      const res = await fetch('/api/menu-scan', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(data.items || [])
    } catch (err) {
      setError('No pudimos leer el menú. Intentá con una imagen más nítida.')
    } finally {
      setLoading(false)
    }
  }

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  const addItem = () => setItems(prev => [...prev, { nombre: '', precio: null, categoria: 'Sin categoría' }])

  // Agrupar por categoría
  const grouped = items.reduce((acc, item) => {
    const cat = item.categoria || 'Sin categoría'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <div className={styles.formWrap}>
      <div className={styles.formTitle}>Menú con IA</div>
      <p className={styles.formSub}>
        Subí una foto de tu carta. La IA extrae automáticamente nombres y precios
        y genera un menú limpio en blanco y negro listo para mostrar.
      </p>

      {/* Upload zone */}
      <div
        className={styles.uploadZone}
        onClick={() => fileRef.current.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); fileRef.current.files = e.dataTransfer.files; handleFile({ target: fileRef.current }) }}
      >
        <input ref={fileRef} type="file" accept="image/*" className={styles.hidden} onChange={handleFile} />
        {preview ? (
          <img src={preview} alt="Menú subido" className={styles.preview} />
        ) : (
          <div className={styles.uploadInner}>
            <div className={styles.uploadIcon}>📷</div>
            <p className={styles.uploadText}>Arrastrá una foto del menú o hacé clic</p>
            <p className={styles.uploadSub}>JPG, PNG o HEIC · máx. 10MB</p>
          </div>
        )}
      </div>

      {loading && (
        <div className={styles.scanningMsg}>
          <div className={styles.spinner} />
          La IA está leyendo tu menú...
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}

      {items.length > 0 && (
        <>
          {/* Editor */}
          <div className={styles.section} style={{ marginTop: 32 }}>
            <div className={styles.sectionTitle}>
              Revisá y editá los items ({items.length} encontrados)
            </div>
            <div className={styles.itemsList}>
              {items.map((item, idx) => (
                <div key={idx} className={styles.itemRow}>
                  <input
                    className={styles.itemName}
                    value={item.nombre}
                    onChange={e => updateItem(idx, 'nombre', e.target.value)}
                    placeholder="Nombre del item"
                  />
                  <input
                    className={styles.itemPrice}
                    type="number"
                    step="0.5"
                    value={item.precio ?? ''}
                    onChange={e => updateItem(idx, 'precio', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="€"
                  />
                  <select
                    className={styles.itemCat}
                    value={item.categoria || ''}
                    onChange={e => updateItem(idx, 'categoria', e.target.value)}
                  >
                    {['Bebidas calientes','Bebidas frías','Comida','Postres','Bocadillos','Vinos y cervezas','Sin categoría'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button className={styles.removeBtn} onClick={() => removeItem(idx)}>✕</button>
                </div>
              ))}
            </div>
            <button className={styles.addItemBtn} onClick={addItem}>+ Añadir item</button>
          </div>

          {/* Preview del menú bonito */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Vista previa del menú</div>
            <div className={styles.menuPreview}>
              <MenuDisplay grouped={grouped} />
            </div>
          </div>

          <div className={styles.saveRow}>
            <button className={styles.saveBtn} onClick={() => alert('Menú guardado. Se mostrará en tu perfil de Nomadia.')}>
              Publicar menú
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Menú visual blanco y negro elegante
function MenuDisplay({ grouped }) {
  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: '#fff',
      color: '#111',
      padding: '40px 36px',
      maxWidth: 520,
      margin: '0 auto',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 36, borderBottom: '1.5px solid #111', paddingBottom: 20 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: -1 }}>
          menú
        </div>
        <div style={{ fontSize: 11, letterSpacing: 3, color: '#555', marginTop: 6, textTransform: 'uppercase' }}>
          Nomadia · Madrid
        </div>
      </div>

      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: '#888',
            borderTop: '0.5px solid #ddd',
            paddingTop: 14,
            marginBottom: 12,
          }}>
            {cat}
          </div>
          {catItems.map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 10,
              gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flex: 1 }}>
                <span style={{ fontSize: 14, color: '#111' }}>{item.nombre}</span>
                <span style={{
                  flex: 1,
                  borderBottom: '1px dotted #ccc',
                  height: 1,
                  marginBottom: 4,
                }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#111', whiteSpace: 'nowrap' }}>
                {item.precio != null ? `€${Number(item.precio).toFixed(2)}` : '—'}
              </span>
            </div>
          ))}
        </div>
      ))}

      <div style={{ marginTop: 32, borderTop: '1px solid #eee', paddingTop: 16, textAlign: 'center', fontSize: 10, color: '#bbb', letterSpacing: 1 }}>
        NOMADIA.ES
      </div>
    </div>
  )
}
