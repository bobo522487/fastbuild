import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@workspace/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const submissions = await prisma.submission.findMany({
      where: { formId: params.id },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(submissions)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { data } = body

    const submission = await prisma.submission.create({
      data: {
        formId: params.id,
        data
      }
    })

    return NextResponse.json(submission, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create submission' },
      { status: 500 }
    )
  }
}