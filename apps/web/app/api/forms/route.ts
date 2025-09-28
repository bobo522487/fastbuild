import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@workspace/database'

export async function GET() {
  try {
    const forms = await prisma.form.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(forms)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, metadata } = body

    const form = await prisma.form.create({
      data: {
        name,
        metadata
      }
    })

    return NextResponse.json(form, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create form' },
      { status: 500 }
    )
  }
}