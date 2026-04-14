import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function Home() {
  // Aa function database ma ek test customer nakhshe
  const createCustomer = async () => {
    'use server'
    await prisma.customer.create({
      data: {
        name: "Test Solar User",
        phone: "9876543210",
      },
    })
    console.log("Customer saved!")
  }

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">Solar CRM Setup Done!</h1>
      <form action={createCustomer}>
        <button className="bg-blue-500 text-white p-2 rounded mt-4">
          Add Test Customer
        </button>
      </form>
    </div>
  )
}