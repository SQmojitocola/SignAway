import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'

export async function POST(req: Request) {
    try {
        const { email, password, name } = await req.json()

        if (!email || !password || !name) {
            return NextResponse.json({ message: 'Data Tidak Lengkap!' }, { status: 400 })
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return NextResponse.json({ message: 'Email Sudah Terdaftar!' }, { status: 400 })
        }

        const hashedPassword = await hashPassword(password)
        const newUser = await prisma.user.create({
            data: {
                email,
                passwordHash: hashedPassword,
                name
            },
        })

        return NextResponse.json(
            { message: 'Registrasi Berhasil!', userId: newUser.id },
            { status: 201 }
        )
    } catch (error) {
        console.error('Error selama registrasi:', error)
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
    }
}
