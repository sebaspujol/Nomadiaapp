'use client'
import { useState } from 'react'
import styles from './dashboard.module.css'

const TIPOS = ['cafe', 'cowork', 'hotel', 'biblioteca']
const TIPO_LABEL = { cafe: 'Café', cowork: 'Cowork', hotel: 'Hotel / Lobby', biblioteca: 'Biblioteca' }
const BARRIOS = ['Malasaña', 'Chueca', 'Salamanca', 'Lavapiés', 'La Latina', 'Retiro', 'Chamberí', 'Moncloa', 'Tetuán', 'Vallecas', 'Otro']

export default function InfoForm({ savedData, onSave }) {
  const [form, setForm] = useState(savedData || {
    nombre: '', tipo: 'cafe', direccion: '', barrio: 'Malasaña',
    descripcion: '', telefono: '', website: '', instagram: '',
    abre: 8, cierra: 22,
    enchufes: 0, wifi: '', precioMin: '', gratis: false,
    silencio: false, mesaLarga: false, tiempoMax: '', consumoMin: '',
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) { onSave(data); setSaved(true); setTimeout(() => setSaved(false), 3000) }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className={styles.formWrap}>
      <div className={styles.formTitle}>Información del local</div>
      <p className={styles.formSub}>Esta información aparecerá en el mapa de Nomadia.</p>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Datos básicos</div>
        <div className={styles.grid2}>
          <Field label="Nombre del lugar *">
            <input value={form.nombre} onChange={e => update('nombre', e.target.value)} placeholder="Ej: Federal Café" />
          </Field>
          <Field label="Tipo de espacio *">
            <select value={form.tipo} onChange={e => update('tipo', e.target.value)}>
              {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
            </select>
          </Field>
        </div>
        <div className={styles.grid2}>
          <Field label="Dirección *">
            <input value={form.direccion} onChange={e => update('direccion', e.target.value)} placeholder="C/ Fuencarral, 123" />
          </Field>
          <Field label="Barrio *">
            <select value={form.barrio} onChange={e => update('barrio', e.target.value)}>
              {BARRIOS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Descripción">
          <textarea value={form.descripcion} onChange={e => update('descripcion', e.target.value)} rows={3} placeholder="Contá algo del ambiente, qué lo hace especial..." />
        </Field>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Contacto y redes</div>
        <div className={styles.grid3}>
          <Field label="Teléfono">
            <input value={form.telefono} onChange={e => update('telefono', e.target.value)} placeholder="+34 600 000 000" />
          </Field>
          <Field label="Web">
            <input value={form.website} onChange={e => update('website', e.target.value)} placeholder="www.tucafe.com" />
          </Field>
          <Field label="Instagram">
            <input value={form.instagram} onChange={e => update('instagram', e.target.value)} placeholder="@tucafe" />
          </Field>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Horario</div>
        <div className={styles.grid2}>
          <Field label="Hora de apertura">
            <select value={form.abre} onChange={e => update('abre', parseInt(e.target.value))}>
              {Array.from({length:18},(_,i)=>i+6).map(h=><option key={h} value={h}>{h}:00</option>)}
            </select>
          </Field>
          <Field label="Hora de cierre">
            <select value={form.cierra} onChange={e => update('cierra', parseInt(e.target.value))}>
              {Array.from({length:18},(_,i)=>i+10).map(h=><option key={h} value={h}>{h}:00</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Condiciones para trabajar</div>
        <div className={styles.grid2}>
          <Field label="Enchufes disponibles">
            <input type="number" min="0" max="200" value={form.enchufes} onChange={e => update('enchufes', parseInt(e.target.value))} />
          </Field>
          <Field label="Velocidad Wifi (Mbps)">
            <input value={form.wifi} onChange={e => update('wifi', e.target.value)} placeholder="Ej: 100" />
          </Field>
        </div>
        <div className={styles.grid2}>
          <Field label="Consumo mínimo">
            <input value={form.consumoMin} onChange={e => update('consumoMin', e.target.value)} placeholder="Ej: 1 café (€2.50)" />
          </Field>
          <Field label="Tiempo máximo de estadía">
            <input value={form.tiempoMax} onChange={e => update('tiempoMax', e.target.value)} placeholder="Ej: Sin límite / 3h máx" />
          </Field>
        </div>
        <div className={styles.checkboxRow}>
          <CheckBox label="Gratis sentarse (sin consumo mínimo)" checked={form.gratis} onChange={v => update('gratis', v)} />
          <CheckBox label="Ambiente silencioso" checked={form.silencio} onChange={v => update('silencio', v)} />
          <CheckBox label="Mesa larga disponible" checked={form.mesaLarga} onChange={v => update('mesaLarga', v)} />
        </div>
      </div>

      <div className={styles.saveRow}>
        {saved && <span className={styles.savedMsg}>✓ Guardado correctamente</span>}
        <button className={styles.saveBtn} onClick={handleSave} disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar información'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

function CheckBox({ label, checked, onChange }) {
  return (
    <label className={styles.checkbox}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  )
}
