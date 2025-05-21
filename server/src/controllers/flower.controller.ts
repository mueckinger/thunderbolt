import type { Context } from 'koa'
import axios from 'axios'

const FLWR_MGMT_KEY = process.env.FLWR_MGMT_KEY

interface CreateFlowerApiKeyRequest {
  billing_id: string
}

export const createFlowerApiKey = async (ctx: Context) => {
  try {
    const { billing_id } = ctx.request.body as CreateFlowerApiKeyRequest

    if (!billing_id) {
      ctx.status = 400
      ctx.body = { success: false, error: 'billing_id parameter is required' }
      return
    }

    if (!FLWR_MGMT_KEY) {
      ctx.status = 500
      ctx.body = { success: false, error: 'Flower management key not configured' }
      return
    }

    const response = await axios.post(
      `https://api.flower.ai/v1/organization/projects/${billing_id}/api_keys`,
      {},
      {
        headers: {
          Authorization: `Bearer ${FLWR_MGMT_KEY}`,
        },
      }
    )

    ctx.body = { success: true, api_key: response.data.api_key }
  } catch (error) {
    console.error('Error creating Flower API key:', error)
    ctx.status = 500
    ctx.body = { success: false, error: 'Failed to create Flower API key' }
  }
}
