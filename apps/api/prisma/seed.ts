import {
  AttributeKind,
  CouponType,
  InventoryReservationStatus,
  OrderItemStatus,
  OrderStatus,
  PrismaClient,
  ProductStatus,
  UserRole,
  VendorStatus,
} from '@prisma/client';
import { hash } from 'bcryptjs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const prisma = new PrismaClient();
const visualSearchAssetDirectory = resolve(
  process.cwd(),
  '../../docs/test-assets/visual-search',
);

async function main() {
  const adminPassword = await hash('Admin@1234', 10);
  const artisanPassword = await hash('Artisan@1234', 10);
  const buyerPassword = await hash('Buyer@1234', 10);
  const [bowlImageUrl, toteImageUrl, lampImageUrl, cupsImageUrl] =
    await Promise.all([
      readSvgAssetAsDataUrl('bloom-serving-bowl-test.svg'),
      readSvgAssetAsDataUrl('cinder-market-tote-test.svg'),
      readSvgAssetAsDataUrl('luna-reed-lamp-test.svg'),
      readSvgAssetAsDataUrl('ripple-stacking-cups-test.svg'),
    ]);

  await prisma.inventoryReservation.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.productAttributeValue.deleteMany();
  await prisma.productAttributeOption.deleteMany();
  await prisma.productAttributeDefinition.deleteMany();
  await prisma.productMaterial.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.materialTag.deleteMany();
  await prisma.ecoRating.deleteMany();
  await prisma.category.deleteMany();
  await prisma.artisanProfile.deleteMany();
  await prisma.user.deleteMany();

  const [earthPositive, closedLoop, mindfulStandard] = await Promise.all([
    prisma.ecoRating.create({
      data: {
        code: 'earth-positive',
        label: 'Earth Positive',
        score: 96,
        description: 'Low-waste, traceable, and locally fulfilled.',
      },
    }),
    prisma.ecoRating.create({
      data: {
        code: 'closed-loop',
        label: 'Closed Loop',
        score: 90,
        description:
          'Built with reclaimed or regenerative materials and thoughtful packaging.',
      },
    }),
    prisma.ecoRating.create({
      data: {
        code: 'mindful-standard',
        label: 'Mindful Standard',
        score: 84,
        description:
          'Verified sustainability improvements with room to optimize over time.',
      },
    }),
  ]);

  const [tableware, bags, lighting] = await Promise.all([
    prisma.category.create({
      data: {
        slug: 'tableware',
        name: 'Tableware',
        description:
          'Hand-thrown and hand-finished pieces for kitchens and shared tables.',
      },
    }),
    prisma.category.create({
      data: {
        slug: 'bags-and-accessories',
        name: 'Bags & Accessories',
        description:
          'Repairable wearables made from deadstock textiles and natural fibers.',
      },
    }),
    prisma.category.create({
      data: {
        slug: 'lighting-and-decor',
        name: 'Lighting & Decor',
        description:
          'Statement home objects built for longevity and low-impact living.',
      },
    }),
  ]);

  const [
    recycledStoneware,
    deadstockCanvas,
    riverReed,
    salvagedOak,
    organicCotton,
  ] = await Promise.all([
    prisma.materialTag.create({
      data: {
        slug: 'recycled-stoneware',
        name: 'Recycled Stoneware',
        origin: 'Reclaimed clay',
        description:
          'Studio clay reclaim blended back into high-durability stoneware.',
        sustainabilityScore: 95,
      },
    }),
    prisma.materialTag.create({
      data: {
        slug: 'deadstock-canvas',
        name: 'Deadstock Canvas',
        origin: 'Deadstock textile',
        description:
          'Unused canvas rolls rescued from industrial surplus streams.',
        sustainabilityScore: 91,
      },
    }),
    prisma.materialTag.create({
      data: {
        slug: 'river-reed',
        name: 'River Reed',
        origin: 'Naturally harvested',
        description:
          'Local reed harvested and dried for woven structures and lighting shades.',
        sustainabilityScore: 93,
      },
    }),
    prisma.materialTag.create({
      data: {
        slug: 'salvaged-oak',
        name: 'Salvaged Oak',
        origin: 'Recovered wood',
        description:
          'Recovered wood milled into durable accent and lighting components.',
        sustainabilityScore: 89,
      },
    }),
    prisma.materialTag.create({
      data: {
        slug: 'organic-cotton',
        name: 'Organic Cotton',
        origin: 'Certified organic',
        description:
          'Soft cotton lining and straps produced with reduced chemical use.',
        sustainabilityScore: 87,
      },
    }),
  ]);

  const [welcomeTen, studioBundle] = await Promise.all([
    prisma.coupon.create({
      data: {
        code: 'WELCOME10',
        label: 'Welcome 10%',
        description:
          'A first-order percentage discount for new GreenCraft buyers.',
        type: CouponType.PERCENTAGE,
        percentOff: 10,
        minimumSubtotalInCents: 5000,
        maxDiscountInCents: 1800,
      },
    }),
    prisma.coupon.create({
      data: {
        code: 'STUDIOBUNDLE',
        label: 'Studio Bundle',
        description:
          'A fixed discount for intentional multi-item handmade bundles.',
        type: CouponType.FIXED_AMOUNT,
        amountOffInCents: 1500,
        minimumSubtotalInCents: 12000,
      },
    }),
  ]);

  const colorDefinition = await prisma.productAttributeDefinition.create({
    data: {
      code: 'color-family',
      label: 'Color Family',
      kind: AttributeKind.SELECT,
      filterGroup: 'Visual',
      sortOrder: 1,
      options: {
        create: [
          { value: 'terracotta', label: 'Terracotta', sortOrder: 1 },
          { value: 'olive', label: 'Olive', sortOrder: 2 },
          { value: 'sand', label: 'Sand', sortOrder: 3 },
          { value: 'natural', label: 'Natural', sortOrder: 4 },
        ],
      },
    },
    include: {
      options: true,
    },
  });

  const roomDefinition = await prisma.productAttributeDefinition.create({
    data: {
      code: 'room',
      label: 'Room',
      kind: AttributeKind.SELECT,
      filterGroup: 'Lifestyle',
      sortOrder: 2,
      options: {
        create: [
          { value: 'kitchen', label: 'Kitchen', sortOrder: 1 },
          { value: 'living-room', label: 'Living Room', sortOrder: 2 },
          { value: 'entryway', label: 'Entryway', sortOrder: 3 },
        ],
      },
    },
    include: {
      options: true,
    },
  });

  const madeToOrderDefinition =
    await prisma.productAttributeDefinition.create({
      data: {
        code: 'made-to-order',
        label: 'Made to Order',
        kind: AttributeKind.BOOLEAN,
        filterGroup: 'Availability',
        sortOrder: 3,
      },
    });

  await prisma.user.create({
    data: {
      email: 'admin@greencraft.local',
      fullName: 'Maya Carter',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  const artisanUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'noura@greencraft.local',
        fullName: 'Noura Benali',
        passwordHash: artisanPassword,
        role: UserRole.ARTISAN,
        artisanProfile: {
          create: {
            slug: 'noura-clay-studio',
            studioName: 'Noura Clay Studio',
            headline: 'Small-batch ceramics made from reclaimed clay.',
            bio: 'Noura shapes thoughtful tableware and serving pieces in Tangier with reclaimed clay blends and shared kiln schedules.',
            location: 'Tangier, Morocco',
            impactStatement:
              'Kiln co-op partner using reclaimed clay and low-waste firing coordination.',
            verificationStatus: VendorStatus.ACTIVE,
            verified: true,
            responseRate: 97,
            averageRating: 4.9,
            totalSales: 184,
          },
        },
      },
      include: {
        artisanProfile: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'selene@greencraft.local',
        fullName: 'Selene Marchand',
        passwordHash: artisanPassword,
        role: UserRole.ARTISAN,
        artisanProfile: {
          create: {
            slug: 'atelier-olive',
            studioName: 'Atelier Olive',
            headline: 'Repairable accessories cut from deadstock fabrics.',
            bio: 'Selene rescues marine canvas and textile surplus to create durable bags and everyday carry essentials.',
            location: 'Marseille, France',
            impactStatement:
              'Deadstock-first sourcing with repair-focused construction and minimal packaging.',
            verificationStatus: VendorStatus.ACTIVE,
            verified: true,
            responseRate: 94,
            averageRating: 4.8,
            totalSales: 236,
          },
        },
      },
      include: {
        artisanProfile: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'khaled@greencraft.local',
        fullName: 'Khaled Fares',
        passwordHash: artisanPassword,
        role: UserRole.ARTISAN,
        artisanProfile: {
          create: {
            slug: 'nile-loom-works',
            studioName: 'Nile Loom Works',
            headline: 'Natural-fiber lighting and decorative forms.',
            bio: 'Khaled works with regional reed harvesters and salvaged wood workshops to build warm, sculptural lighting pieces.',
            location: 'Aswan, Egypt',
            impactStatement:
              'Regional natural-fiber supply chain with transparent sourcing notes on every listing.',
            verificationStatus: VendorStatus.ACTIVE,
            verified: true,
            responseRate: 91,
            averageRating: 4.7,
            totalSales: 121,
          },
        },
      },
      include: {
        artisanProfile: true,
      },
    }),
  ]);

  const buyer = await prisma.user.create({
    data: {
      email: 'buyer@greencraft.local',
      fullName: 'Jordan Lee',
      passwordHash: buyerPassword,
      role: UserRole.BUYER,
    },
  });

  const [noura, selene, khaled] = artisanUsers.map(
    (artisan) => artisan.artisanProfile!,
  );

  const [bowl, tote, lamp, cups] = await Promise.all([
    prisma.product.create({
      data: {
        artisanId: noura.id,
        categoryId: tableware.id,
        ecoRatingId: earthPositive.id,
        slug: 'bloom-serving-bowl',
        name: 'Bloom Serving Bowl',
        shortDescription:
          'A reclaimed-stoneware bowl glazed in warm mineral tones.',
        description:
          'Designed for everyday gatherings, the Bloom Serving Bowl balances a generous silhouette with durable stoneware construction and a naturally varied glaze finish.',
        story:
          'Thrown in small batches using reclaimed clay offcuts and fired in an energy-sharing kiln schedule with neighboring ceramic studios.',
        priceInCents: 5800,
        inventoryCount: 14,
        impactScore: 95,
        co2SavedKg: 5.6,
        leadTimeDays: 4,
        status: ProductStatus.PUBLISHED,
        isFeatured: true,
        images: {
          create: [
            {
              url: bowlImageUrl,
              alt: 'Bloom Serving Bowl',
            },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        artisanId: selene.id,
        categoryId: bags.id,
        ecoRatingId: closedLoop.id,
        slug: 'cinder-market-tote',
        name: 'Cinder Market Tote',
        shortDescription:
          'A structured deadstock canvas tote built for daily carry.',
        description:
          'This tote is reinforced for groceries, laptops, and weekend essentials with repair-friendly seams and a soft organic cotton lining.',
        story:
          'Cut from reclaimed sailcloth remnants and deadstock canvas, then finished with replaceable straps for a longer product life.',
        priceInCents: 7200,
        inventoryCount: 10,
        impactScore: 91,
        co2SavedKg: 3.8,
        leadTimeDays: 3,
        status: ProductStatus.PUBLISHED,
        isFeatured: true,
        images: {
          create: [
            {
              url: toteImageUrl,
              alt: 'Cinder Market Tote',
            },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        artisanId: khaled.id,
        categoryId: lighting.id,
        ecoRatingId: earthPositive.id,
        slug: 'luna-reed-lamp',
        name: 'Luna Reed Lamp',
        shortDescription:
          'A sculptural woven lamp with a warm, organic glow.',
        description:
          'Woven from locally harvested reed over a lightweight salvaged oak frame, the Luna Reed Lamp adds warmth while keeping materials transparent and repairable.',
        story:
          'Built with natural reed from the Nile basin and finished with biodegradable oils for a long-lasting, low-impact home object.',
        priceInCents: 13800,
        inventoryCount: 6,
        impactScore: 96,
        co2SavedKg: 9.4,
        leadTimeDays: 7,
        status: ProductStatus.PUBLISHED,
        isFeatured: true,
        images: {
          create: [
            {
              url: lampImageUrl,
              alt: 'Luna Reed Lamp',
            },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        artisanId: noura.id,
        categoryId: tableware.id,
        ecoRatingId: mindfulStandard.id,
        slug: 'ripple-stacking-cups',
        name: 'Ripple Stacking Cups',
        shortDescription:
          'Stackable cups designed for tea rituals and compact shelving.',
        description:
          'A set of stackable cups with a textured exterior and a smooth hand-finished lip.',
        story:
          'Made from small-batch reclaimed clay blends that reduce waste between larger ceramic runs.',
        priceInCents: 4600,
        inventoryCount: 22,
        impactScore: 87,
        co2SavedKg: 2.8,
        leadTimeDays: 4,
        status: ProductStatus.PUBLISHED,
        isFeatured: false,
        images: {
          create: [
            {
              url: cupsImageUrl,
              alt: 'Ripple Stacking Cups',
            },
          ],
        },
      },
    }),
  ]);

  const optionFor = (
    definition: { options: { value: string; id: string }[] },
    value: string,
  ) => definition.options.find((option) => option.value === value)?.id;

  await prisma.productMaterial.createMany({
    data: [
      { productId: bowl.id, materialTagId: recycledStoneware.id, percentage: 100 },
      { productId: tote.id, materialTagId: deadstockCanvas.id, percentage: 80 },
      { productId: tote.id, materialTagId: organicCotton.id, percentage: 20 },
      { productId: lamp.id, materialTagId: riverReed.id, percentage: 70 },
      { productId: lamp.id, materialTagId: salvagedOak.id, percentage: 30 },
      { productId: cups.id, materialTagId: recycledStoneware.id, percentage: 100 },
    ],
  });

  await prisma.productAttributeValue.createMany({
    data: [
      {
        productId: bowl.id,
        definitionId: colorDefinition.id,
        optionId: optionFor(colorDefinition, 'terracotta'),
      },
      {
        productId: bowl.id,
        definitionId: roomDefinition.id,
        optionId: optionFor(roomDefinition, 'kitchen'),
      },
      {
        productId: bowl.id,
        definitionId: madeToOrderDefinition.id,
        valueBoolean: false,
      },
      {
        productId: tote.id,
        definitionId: colorDefinition.id,
        optionId: optionFor(colorDefinition, 'olive'),
      },
      {
        productId: tote.id,
        definitionId: roomDefinition.id,
        optionId: optionFor(roomDefinition, 'entryway'),
      },
      {
        productId: tote.id,
        definitionId: madeToOrderDefinition.id,
        valueBoolean: true,
      },
      {
        productId: lamp.id,
        definitionId: colorDefinition.id,
        optionId: optionFor(colorDefinition, 'natural'),
      },
      {
        productId: lamp.id,
        definitionId: roomDefinition.id,
        optionId: optionFor(roomDefinition, 'living-room'),
      },
      {
        productId: lamp.id,
        definitionId: madeToOrderDefinition.id,
        valueBoolean: true,
      },
      {
        productId: cups.id,
        definitionId: colorDefinition.id,
        optionId: optionFor(colorDefinition, 'sand'),
      },
      {
        productId: cups.id,
        definitionId: roomDefinition.id,
        optionId: optionFor(roomDefinition, 'kitchen'),
      },
      {
        productId: cups.id,
        definitionId: madeToOrderDefinition.id,
        valueBoolean: false,
      },
    ].map((item) => ({
      ...item,
      optionId: item.optionId ?? null,
      valueBoolean: item.valueBoolean ?? null,
    })),
  });

  const seededOrder = await prisma.order.create({
    data: {
      orderNumber: 'GC-20260412-0001',
      buyerId: buyer.id,
      couponId: welcomeTen.id,
      cartSessionId: 'seed-session-jordan',
      status: OrderStatus.CONFIRMED,
      currency: 'USD',
      subtotalInCents: 13000,
      couponDiscountInCents: 1300,
      bundleDiscountInCents: 0,
      totalInCents: 11700,
      shippingName: 'Jordan Lee',
      shippingEmail: 'buyer@greencraft.local',
      shippingAddressLine1: '18 Palm Court',
      shippingCity: 'Casablanca',
      shippingPostalCode: '20000',
      shippingCountry: 'Morocco',
      notes: 'Seeded Sprint 3 order for buyer dashboard and OMS workflows.',
      items: {
        create: [
          {
            productId: bowl.id,
            artisanId: noura.id,
            status: OrderItemStatus.CONFIRMED,
            productName: bowl.name,
            artisanStudioName: noura.studioName,
            unitPriceInCents: bowl.priceInCents,
            quantity: 1,
            lineTotalInCents: bowl.priceInCents,
            impactScore: bowl.impactScore,
            co2SavedKg: bowl.co2SavedKg,
            currency: bowl.currency,
          },
          {
            productId: tote.id,
            artisanId: selene.id,
            status: OrderItemStatus.CONFIRMED,
            productName: tote.name,
            artisanStudioName: selene.studioName,
            unitPriceInCents: tote.priceInCents,
            quantity: 1,
            lineTotalInCents: tote.priceInCents,
            impactScore: tote.impactScore,
            co2SavedKg: tote.co2SavedKg,
            currency: tote.currency,
          },
        ],
      },
    },
  });

  await prisma.inventoryReservation.createMany({
    data: [
      {
        sessionId: seededOrder.cartSessionId,
        productId: bowl.id,
        orderId: seededOrder.id,
        quantity: 1,
        status: InventoryReservationStatus.CONSUMED,
        expiresAt: new Date('2026-04-11T12:00:00.000Z'),
      },
      {
        sessionId: seededOrder.cartSessionId,
        productId: tote.id,
        orderId: seededOrder.id,
        quantity: 1,
        status: InventoryReservationStatus.CONSUMED,
        expiresAt: new Date('2026-04-11T12:00:00.000Z'),
      },
    ],
  });

  console.log('Seeded GreenCraft Sprint 3 data.');
  console.log('Admin login: admin@greencraft.local / Admin@1234');
  console.log('Artisan login: noura@greencraft.local / Artisan@1234');
  console.log('Buyer login: buyer@greencraft.local / Buyer@1234');
  console.log(`Coupons: ${welcomeTen.code}, ${studioBundle.code}`);
}

async function readSvgAssetAsDataUrl(filename: string) {
  const svg = await readFile(resolve(visualSearchAssetDirectory, filename), 'utf8');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
