import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@workspace/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const form = await prisma.form.findUnique({
      where: { id: params.id },
      include: {
        submissions: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(form)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch form' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, metadata } = body

    const form = await prisma.form.update({
      where: { id: params.id },
      data: {
        name,
        metadata,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(form)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update form' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.form.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete form' },
      { status: 500 }
    )
  }
}