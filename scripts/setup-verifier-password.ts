import 'dotenv/config'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

import { findUserByEmail, activateStaffAccount } from '../server/repositories/user.repository'
import { hashPassword } from '../server/utils/password'

const email = 'fernandomanalu52@gmail.com'

async function main() {
  const user = await findUserByEmail(email)

  if (!user) {
    throw new Error('Akun verifikator tidak ditemukan.')
  }

  if (user.role !== 'VERIFIER') {
    throw new Error('Akun yang ditemukan bukan akun VERIFIER.')
  }

  if (
    user.account_status !== 'PENDING_ACTIVATION' &&
    user.account_status !== 'ACTIVE'
  ) {
    throw new Error(
      `Status akun ${user.account_status} tidak memungkinkan penetapan kata sandi.`,
    )
  }

  const terminal = createInterface({ input: stdin, output: stdout })

  try {
    const password = await terminal.question(
      'Masukkan kata sandi baru (minimal 12 karakter): ',
    )
    const confirmation = await terminal.question(
      'Konfirmasi kata sandi baru: ',
    )

    if (password.length < 12) {
      throw new Error('Kata sandi harus minimal 12 karakter.')
    }

    if (password !== confirmation) {
      throw new Error('Konfirmasi kata sandi tidak cocok.')
    }

    const passwordHash = await hashPassword(password)

    const updatedUser = await activateStaffAccount(
      user.user_id,
      passwordHash,
    )

    console.log('Kata sandi akun verifikator berhasil ditetapkan.')
    console.log(`User ID: ${updatedUser.user_id}`)
    console.log(`Role: ${updatedUser.role}`)
    console.log(`Status: ${updatedUser.account_status}`)
  } finally {
    terminal.close()
  }
}

main().catch((error) => {
  console.error('Gagal menyiapkan kata sandi:', error)
  process.exitCode = 1
})
