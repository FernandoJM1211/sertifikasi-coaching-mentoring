import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

import {
  createUser,
  findUserByEmail,
} from '../server/repositories/user.repository'
import {
  hashPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../server/utils/password'

async function main() {
  const terminal = createInterface({
    input: stdin,
    output: stdout,
  })

  try {
    const email = (
      await terminal.question('Email Super Admin: ')
    ).trim().toLowerCase()

    const fullName = (
      await terminal.question('Nama lengkap Super Admin: ')
    ).trim()

    if (!email || !fullName) {
      throw new Error('Email dan nama lengkap wajib diisi.')
    }

    const existingUser = await findUserByEmail(email)

    if (existingUser) {
      throw new Error(
        `Email ${email} sudah terdaftar. Tidak ada perubahan data.`,
      )
    }

    const password = await terminal.question(
      `Kata sandi awal (minimal ${PASSWORD_MIN_LENGTH} karakter): `,
    )
    const confirmation = await terminal.question(
      'Konfirmasi kata sandi: ',
    )

    if (
      password.length < PASSWORD_MIN_LENGTH ||
      password.length > PASSWORD_MAX_LENGTH
    ) {
      throw new Error(
        `Kata sandi harus ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} karakter.`,
      )
    }

    if (password !== confirmation) {
      throw new Error('Konfirmasi kata sandi tidak cocok.')
    }

    const passwordHash = await hashPassword(password)

    const user = await createUser({
      full_name: fullName,
      username_email: email,
      password_hash: passwordHash,
      role: 'SUPER_ADMIN',
      account_status: 'ACTIVE',
    })

    console.log('\nAkun Super Admin berhasil dibuat.')
    console.log(`User ID: ${user.user_id}`)
    console.log(`Email: ${user.username_email}`)
    console.log(`Role: ${user.role}`)
    console.log(`Status: ${user.account_status}`)
  } finally {
    terminal.close()
  }
}

main().catch((error) => {
  console.error('Gagal membuat akun Super Admin:', error)
  process.exitCode = 1
})
