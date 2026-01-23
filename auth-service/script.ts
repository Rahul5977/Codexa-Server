import { prisma } from "./libs/prisma.js"

async function main() {
    const user = await prisma.user.create({
        data: {
            name: "John Doe",
            email: "oMg9R@example.com",
            password: "password",
        },
    })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })