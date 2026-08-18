import Stripe from 'stripe'

// Usa a versão da API embutida por defeito no SDK instalado (não fixamos apiVersion
// aqui para evitar desalinhar do que o pacote 'stripe' instalado realmente espera).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
