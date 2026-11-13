import 'dotenv/config'

import {
  findUserByEmail,
} from '../server/repositories/user.repository'

const email = 'fernandomanalu52@gmail.com'

async function main() {
  const user = await findUserByEmail(email)

  if (!user) {
    throw new Error(
      `Akun ${email} belum ditemukan. Tidak ada perubahan yang dilakukan.`,
    )
  }

  console.log('Akun verifikator ditemukan.')
  console.log(`User ID: ${user.user_id}`)
  console.log(`Email: ${user.username_email}`)
  console.log(`Role: ${user.role}`)
  console.log(`Status: ${user.account_status}`)
  console.log('Tidak ada perubahan data.')
}

main().catch((error) => {
  console.error('Pemeriksaan akun gagal:', error)
  process.exitCode = 1
})