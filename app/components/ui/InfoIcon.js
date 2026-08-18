'use client'

import { useState } from 'react'
import Modal from './Modal'

export default function InfoIcon({ titulo, texto }) {
  const [aberto, setAberto] = useState(false)

  function abrir(e) {
    // Impede que o toque seja também interpretado como clique num elemento
    // pai (ex. um <label> associado a um checkbox onde este ícone esteja).
    e.preventDefault()
    e.stopPropagation()
    setAberto(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label={`Mais informação: ${titulo}`}
        className="inline-flex items-center justify-center w-8 h-8 -my-1.5 ml-1 rounded-full text-brand-navy cursor-pointer align-middle shrink-0"
      >
        <span className="w-5 h-5 rounded-full border border-brand-navy text-[11px] leading-none font-bold flex items-center justify-center">
          i
        </span>
      </button>

      <Modal open={aberto} onClose={() => setAberto(false)}>
        <h2 className="text-lg font-bold text-gray-900 mb-3">{titulo}</h2>
        <p className="text-sm text-gray-900 leading-relaxed mb-5">{texto}</p>
        <button
          onClick={() => setAberto(false)}
          className="w-full rounded-lg px-5 py-2.5 font-medium bg-brand-navy text-white hover:opacity-90 transition cursor-pointer"
        >
          Entendi
        </button>
      </Modal>
    </>
  )
}
