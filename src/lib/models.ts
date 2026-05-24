export type Category = {
  id: string
  name: string
  subCategories: SubCategory[]
}

export type SubCategory = {
  id: string
  categoryId: string
  name: string
}

export type User = {
  id: string
  fullName: string
  email: string
  phone: string
  isPhonePublic: boolean
  isEmailPublic: boolean
}

export type ListingImage = {
  id?: string
  url: string
  sortOrder?: number
}

export type Listing = {
  id: string
  title: string
  description: string
  priceCents: number
  currency: string
  status: string
  soldAt?: string | null
  needsReview?: boolean
  city: string | null
  state: string | null
  createdAt: string
  category?: { id: string; name: string }
  subCategory?: { id: string; name: string } | null
  images: ListingImage[]
  user?: User
}

export type Order = {
  id: string
  buyerId: string
  listingId: string
  status: 'OPEN' | 'COMPLETED' | 'CANCELED'
  createdAt: string
  listing?: Listing
}

export type Sale = {
  id: string
  sellerId: string
  listingId: string
  status: 'OPEN' | 'COMPLETED' | 'CANCELED'
  createdAt: string
  listing?: Listing
}
