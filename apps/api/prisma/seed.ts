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
import { extname, resolve } from 'node:path';

const prisma = new PrismaClient();
const fixtureAssetDirectory = resolve(process.cwd(), '../../docs/test-assets');

async function main() {
  const adminPassword = await hash('Admin@1234', 10);
  const artisanPassword = await hash('Artisan@1234', 10);
  const buyerPassword = await hash('Buyer@1234', 10);
  const [
    bowlImageUrl,
    toteImageUrl,
    lampImageUrl,
    cupsImageUrl,
    cabasImageUrl,
    cushionImageUrl,
    spoonsImageUrl,
    mirrorImageUrl,
    basketImageUrl,
    trayImageUrl,
    pouchImageUrl,
    vaseImageUrl,
  ] = await Promise.all([
    readRasterAssetAsDataUrl('visual-search/bloom-serving-bowl-test.jpg'),
    readRasterAssetAsDataUrl('visual-search/cinder-market-tote-test.jpg'),
    readRasterAssetAsDataUrl('visual-search/luna-reed-lamp-test.jpg'),
    readRasterAssetAsDataUrl('visual-search/ripple-stacking-cups-test.jpg'),
    readRasterAssetAsDataUrl('catalog/cabas-zitouna-atelier.jpg'),
    readRasterAssetAsDataUrl('catalog/coussin-sidi-bou.jpg'),
    readRasterAssetAsDataUrl('catalog/cuilleres-carthage.jpg'),
    readRasterAssetAsDataUrl('catalog/miroir-medina-laiton.jpg'),
    readRasterAssetAsDataUrl('catalog/panier-kerkennah.jpg'),
    readRasterAssetAsDataUrl('catalog/plateau-jasmin-olivier.jpg'),
    readRasterAssetAsDataUrl('catalog/pochette-indigo-sahel.jpg'),
    readRasterAssetAsDataUrl('catalog/vase-sable-hammamet.jpg'),
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
    oliveWood,
    washedLinen,
    palmFiber,
    recycledBrass,
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
    prisma.materialTag.create({
      data: {
        slug: 'olive-wood',
        name: 'Olive Wood',
        origin: 'Local olive groves',
        description:
          'Dense olive wood shaped into durable table objects with visible natural grain.',
        sustainabilityScore: 90,
      },
    }),
    prisma.materialTag.create({
      data: {
        slug: 'washed-linen',
        name: 'Washed Linen',
        origin: 'Natural fiber textile',
        description:
          'Breathable linen selected for tactile soft furnishings and low-waste finishing.',
        sustainabilityScore: 88,
      },
    }),
    prisma.materialTag.create({
      data: {
        slug: 'palm-fiber',
        name: 'Palm Fiber',
        origin: 'Regional weaving fiber',
        description:
          'Hand-prepared palm strands woven into baskets and storage pieces.',
        sustainabilityScore: 92,
      },
    }),
    prisma.materialTag.create({
      data: {
        slug: 'recycled-brass',
        name: 'Recycled Brass',
        origin: 'Recast metal',
        description:
          'Recovered brass reworked into small home accents with a mellow patina.',
        sustainabilityScore: 86,
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
            bio: 'Noura shapes thoughtful tableware and serving pieces in Nabeul with reclaimed clay blends and shared kiln schedules.',
            location: 'Nabeul, Tunisia',
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
            bio: 'Selene rescues textile surplus and deadstock canvas in Sousse to create durable bags and everyday carry essentials.',
            location: 'Sousse, Tunisia',
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
            bio: 'Khaled works with regional reed harvesters and salvaged wood workshops in Tozeur to build warm, sculptural lighting pieces.',
            location: 'Tozeur, Tunisia',
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

  const productCreatedAt = {
    bowl: new Date('2026-04-08T09:00:00.000Z'),
    tote: new Date('2026-04-09T09:00:00.000Z'),
    lamp: new Date('2026-04-10T09:00:00.000Z'),
    cups: new Date('2026-04-11T09:00:00.000Z'),
    tray: new Date('2026-04-12T09:00:00.000Z'),
    cushion: new Date('2026-04-13T09:00:00.000Z'),
    spoons: new Date('2026-04-14T09:00:00.000Z'),
    mirror: new Date('2026-04-15T09:00:00.000Z'),
    vase: new Date('2026-04-16T09:00:00.000Z'),
    cabas: new Date('2026-04-17T09:00:00.000Z'),
    basket: new Date('2026-04-18T09:00:00.000Z'),
    pouch: new Date('2026-04-19T09:00:00.000Z'),
  } as const;

  const [
    bowl,
    tote,
    lamp,
    cups,
    tray,
    cushion,
    spoons,
    mirror,
    vase,
    cabas,
    basket,
    pouch,
  ] = await Promise.all([
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
        currency: 'TND',
        priceInCents: 5800,
        inventoryCount: 14,
        impactScore: 95,
        co2SavedKg: 5.6,
        leadTimeDays: 4,
        status: ProductStatus.PUBLISHED,
        isFeatured: true,
        createdAt: productCreatedAt.bowl,
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
        currency: 'TND',
        priceInCents: 7200,
        inventoryCount: 10,
        impactScore: 91,
        co2SavedKg: 3.8,
        leadTimeDays: 3,
        status: ProductStatus.PUBLISHED,
        isFeatured: true,
        createdAt: productCreatedAt.tote,
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
        currency: 'TND',
        priceInCents: 13800,
        inventoryCount: 6,
        impactScore: 96,
        co2SavedKg: 9.4,
        leadTimeDays: 7,
        status: ProductStatus.PUBLISHED,
        isFeatured: true,
        createdAt: productCreatedAt.lamp,
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
        currency: 'TND',
        priceInCents: 4600,
        inventoryCount: 22,
        impactScore: 87,
        co2SavedKg: 2.8,
        leadTimeDays: 4,
        status: ProductStatus.PUBLISHED,
        isFeatured: false,
        createdAt: productCreatedAt.cups,
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
    prisma.product.create({
      data: {
        artisanId: noura.id,
        categoryId: tableware.id,
        ecoRatingId: closedLoop.id,
        slug: 'plateau-jasmin-olivier',
        name: "Plateau Jasmin d'Olivier",
        shortDescription:
          "Un plateau de service en bois d'olivier aux bords adoucis a la main.",
        description:
          "Ce plateau artisanal est pense pour le service du cafe, du the ou des petites assiettes avec une silhouette simple et un veinage naturel tres present.",
        story:
          "Chaque plateau est taille dans du bois d'olivier local puis poli manuellement pour conserver les nuances naturelles et limiter les pertes de matiere.",
        currency: 'TND',
        priceInCents: 9600,
        inventoryCount: 9,
        impactScore: 90,
        co2SavedKg: 4.2,
        leadTimeDays: 5,
        status: ProductStatus.PUBLISHED,
        isFeatured: false,
        createdAt: productCreatedAt.tray,
        images: {
          create: [
            {
              url: trayImageUrl,
              alt: "Plateau Jasmin d'Olivier",
            },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        artisanId: khaled.id,
        categoryId: lighting.id,
        ecoRatingId: mindfulStandard.id,
        slug: 'coussin-sidi-bou',
        name: 'Coussin Tisse Sidi Bou',
        shortDescription:
          'Un coussin tisse en lin lave pour rechauffer un salon ou une banquette.',
        description:
          "Ce coussin decoratif marie un tissage dense, des rayures olive et une matiere souple pour apporter une touche artisanale facile a vivre.",
        story:
          "Le tissu est coupe en petites series et assemble avec un remplissage pense pour durer plus d'une saison sans perdre son maintien.",
        currency: 'TND',
        priceInCents: 6400,
        inventoryCount: 12,
        impactScore: 89,
        co2SavedKg: 3.1,
        leadTimeDays: 4,
        status: ProductStatus.PUBLISHED,
        isFeatured: false,
        createdAt: productCreatedAt.cushion,
        images: {
          create: [
            {
              url: cushionImageUrl,
              alt: 'Coussin Tisse Sidi Bou',
            },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        artisanId: noura.id,
        categoryId: tableware.id,
        ecoRatingId: earthPositive.id,
        slug: 'cuilleres-carthage',
        name: "Cuilleres Carthage en Olivier",
        shortDescription:
          "Un lot de cuilleres en bois d'olivier pour la cuisine du quotidien.",
        description:
          "Ce set rassemble plusieurs cuilleres sculptees a la main, avec des formes simples pour cuisiner, servir et presenter a table.",
        story:
          "Le bois est choisi pour son veinage dense puis travaille en petite serie afin d'obtenir des ustensiles utiles et faciles a entretenir.",
        currency: 'TND',
        priceInCents: 4200,
        inventoryCount: 16,
        impactScore: 88,
        co2SavedKg: 2.4,
        leadTimeDays: 3,
        status: ProductStatus.PUBLISHED,
        isFeatured: false,
        createdAt: productCreatedAt.spoons,
        images: {
          create: [
            {
              url: spoonsImageUrl,
              alt: "Cuilleres Carthage en Olivier",
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
        slug: 'miroir-medina-laiton',
        name: 'Miroir Medina Laiton',
        shortDescription:
          'Un miroir mural rond en laiton recycle au rendu chaleureux.',
        description:
          'Son cadre fin au fini patine apporte une note artisanale douce pour une entree, un salon ou une chambre.',
        story:
          "Le cadre est realise a partir de laiton revalorise puis poli en atelier pour conserver un aspect chaleureux sans tomber dans l'effet trop brillant.",
        currency: 'TND',
        priceInCents: 11800,
        inventoryCount: 7,
        impactScore: 94,
        co2SavedKg: 6.8,
        leadTimeDays: 6,
        status: ProductStatus.PUBLISHED,
        isFeatured: true,
        createdAt: productCreatedAt.mirror,
        images: {
          create: [
            {
              url: mirrorImageUrl,
              alt: 'Miroir Medina Laiton',
            },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        artisanId: noura.id,
        categoryId: lighting.id,
        ecoRatingId: closedLoop.id,
        slug: 'vase-sable-hammamet',
        name: 'Vase Sable de Hammamet',
        shortDescription:
          'Un vase en ceramique sablee aux courbes souples et a la texture mate.',
        description:
          'Concu pour recevoir quelques tiges sechees ou vivre seul sur une console, ce vase mise sur la matiere et la forme plus que sur l ornement.',
        story:
          "Il est tourne a la main, emaille legerement puis cuit avec d'autres pieces de l'atelier pour mutualiser les fournees.",
        currency: 'TND',
        priceInCents: 7600,
        inventoryCount: 11,
        impactScore: 93,
        co2SavedKg: 4.7,
        leadTimeDays: 4,
        status: ProductStatus.PUBLISHED,
        isFeatured: false,
        createdAt: productCreatedAt.vase,
        images: {
          create: [
            {
              url: vaseImageUrl,
              alt: 'Vase Sable de Hammamet',
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
        slug: 'cabas-zitouna-atelier',
        name: 'Cabas Zitouna Atelier',
        shortDescription:
          'Un grand cabas naturel aux anses olive, pense pour la vie quotidienne.',
        description:
          'Ce cabas artisanal garde une tenue souple mais structuree pour emporter courses, carnets et essentiels sans perdre en elegance.',
        story:
          'La toile est renforcee par des coutures visibles et des anses tissees pour offrir un sac durable, facile a reparer et a reemployer longtemps.',
        currency: 'TND',
        priceInCents: 8400,
        inventoryCount: 13,
        impactScore: 92,
        co2SavedKg: 4.4,
        leadTimeDays: 3,
        status: ProductStatus.PUBLISHED,
        isFeatured: false,
        createdAt: productCreatedAt.cabas,
        images: {
          create: [
            {
              url: cabasImageUrl,
              alt: 'Cabas Zitouna Atelier',
            },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        artisanId: khaled.id,
        categoryId: bags.id,
        ecoRatingId: earthPositive.id,
        slug: 'panier-kerkennah',
        name: 'Panier Palmier Kerkennah',
        shortDescription:
          'Un panier tresse en fibre de palmier pour le marche et la maison.',
        description:
          'Sa forme ouverte et ses petites anses en font une piece polyvalente, utile autant pour les courses que pour le rangement decoratif.',
        story:
          'Le panier est tresse a partir de fibres preparees a la main puis assemble avec une finition simple pour garder un geste artisanal lisible.',
        currency: 'TND',
        priceInCents: 6900,
        inventoryCount: 15,
        impactScore: 91,
        co2SavedKg: 3.9,
        leadTimeDays: 4,
        status: ProductStatus.PUBLISHED,
        isFeatured: false,
        createdAt: productCreatedAt.basket,
        images: {
          create: [
            {
              url: basketImageUrl,
              alt: 'Panier Palmier Kerkennah',
            },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        artisanId: selene.id,
        categoryId: bags.id,
        ecoRatingId: mindfulStandard.id,
        slug: 'pochette-indigo-sahel',
        name: 'Pochette Indigo du Sahel',
        shortDescription:
          'Une petite pochette en textile teint indigo pour les objets du quotidien.',
        description:
          'Sa taille compacte convient aux cables, papiers ou petits accessoires que l on souhaite garder a part dans un sac plus grand.',
        story:
          "La toile est montee en atelier avec une doublure claire et une fermeture simple afin de proposer une piece pratique et facile a utiliser tous les jours.",
        currency: 'TND',
        priceInCents: 3600,
        inventoryCount: 19,
        impactScore: 90,
        co2SavedKg: 2.1,
        leadTimeDays: 3,
        status: ProductStatus.PUBLISHED,
        isFeatured: false,
        createdAt: productCreatedAt.pouch,
        images: {
          create: [
            {
              url: pouchImageUrl,
              alt: 'Pochette Indigo du Sahel',
            },
          ],
        },
      },
    }),
  ]);

  await prisma.product.updateMany({
    where: {
      id: {
        in: [
          bowl.id,
          tote.id,
          lamp.id,
          cups.id,
          tray.id,
          cushion.id,
          spoons.id,
          mirror.id,
          vase.id,
          cabas.id,
          basket.id,
          pouch.id,
        ],
      },
    },
    data: {
      currency: 'TND',
    },
  });

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
      { productId: tray.id, materialTagId: oliveWood.id, percentage: 100 },
      { productId: cushion.id, materialTagId: washedLinen.id, percentage: 70 },
      { productId: cushion.id, materialTagId: organicCotton.id, percentage: 30 },
      { productId: spoons.id, materialTagId: oliveWood.id, percentage: 100 },
      { productId: mirror.id, materialTagId: recycledBrass.id, percentage: 100 },
      { productId: vase.id, materialTagId: recycledStoneware.id, percentage: 100 },
      { productId: cabas.id, materialTagId: deadstockCanvas.id, percentage: 75 },
      { productId: cabas.id, materialTagId: organicCotton.id, percentage: 25 },
      { productId: basket.id, materialTagId: palmFiber.id, percentage: 100 },
      { productId: pouch.id, materialTagId: organicCotton.id, percentage: 55 },
      { productId: pouch.id, materialTagId: deadstockCanvas.id, percentage: 45 },
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
      {
        productId: tray.id,
        definitionId: colorDefinition.id,
        optionId: optionFor(colorDefinition, 'natural'),
      },
      {
        productId: tray.id,
        definitionId: roomDefinition.id,
        optionId: optionFor(roomDefinition, 'kitchen'),
      },
      {
        productId: tray.id,
        definitionId: madeToOrderDefinition.id,
        valueBoolean: false,
      },
      {
        productId: cushion.id,
        definitionId: colorDefinition.id,
        optionId: optionFor(colorDefinition, 'olive'),
      },
      {
        productId: cushion.id,
        definitionId: roomDefinition.id,
        optionId: optionFor(roomDefinition, 'living-room'),
      },
      {
        productId: cushion.id,
        definitionId: madeToOrderDefinition.id,
        valueBoolean: true,
      },
      {
        productId: spoons.id,
        definitionId: colorDefinition.id,
        optionId: optionFor(colorDefinition, 'natural'),
      },
      {
        productId: spoons.id,
        definitionId: roomDefinition.id,
        optionId: optionFor(roomDefinition, 'kitchen'),
      },
      {
        productId: spoons.id,
        definitionId: madeToOrderDefinition.id,
        valueBoolean: false,
      },
      {
        productId: mirror.id,
        definitionId: colorDefinition.id,
        optionId: optionFor(colorDefinition, 'sand'),
      },
      {
        productId: mirror.id,
        definitionId: roomDefinition.id,
        optionId: optionFor(roomDefinition, 'entryway'),
      },
      {
        productId: mirror.id,
        definitionId: madeToOrderDefinition.id,
        valueBoolean: true,
      },
      {
        productId: vase.id,
        definitionId: colorDefinition.id,
        optionId: optionFor(colorDefinition, 'sand'),
      },
      {
        productId: vase.id,
        definitionId: roomDefinition.id,
        optionId: optionFor(roomDefinition, 'living-room'),
      },
      {
        productId: vase.id,
        definitionId: madeToOrderDefinition.id,
        valueBoolean: false,
      },
      {
        productId: cabas.id,
        definitionId: colorDefinition.id,
        optionId: optionFor(colorDefinition, 'olive'),
      },
      {
        productId: cabas.id,
        definitionId: roomDefinition.id,
        optionId: optionFor(roomDefinition, 'entryway'),
      },
      {
        productId: cabas.id,
        definitionId: madeToOrderDefinition.id,
        valueBoolean: true,
      },
      {
        productId: basket.id,
        definitionId: colorDefinition.id,
        optionId: optionFor(colorDefinition, 'natural'),
      },
      {
        productId: basket.id,
        definitionId: roomDefinition.id,
        optionId: optionFor(roomDefinition, 'entryway'),
      },
      {
        productId: basket.id,
        definitionId: madeToOrderDefinition.id,
        valueBoolean: true,
      },
      {
        productId: pouch.id,
        definitionId: colorDefinition.id,
        optionId: optionFor(colorDefinition, 'sand'),
      },
      {
        productId: pouch.id,
        definitionId: roomDefinition.id,
        optionId: optionFor(roomDefinition, 'entryway'),
      },
      {
        productId: pouch.id,
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
      currency: 'TND',
      subtotalInCents: 13000,
      couponDiscountInCents: 1300,
      bundleDiscountInCents: 0,
      totalInCents: 11700,
      shippingName: 'Jordan Lee',
      shippingEmail: 'buyer@greencraft.local',
      shippingAddressLine1: '18 Palm Court',
      shippingCity: 'Tunis',
      shippingPostalCode: '1000',
      shippingCountry: 'Tunisia',
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
            currency: 'TND',
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
            currency: 'TND',
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

async function readRasterAssetAsDataUrl(filename: string) {
  const extension = extname(filename).toLowerCase();
  const mimeType =
    extension === '.png'
      ? 'image/png'
      : extension === '.webp'
        ? 'image/webp'
        : 'image/jpeg';
  const image = await readFile(resolve(fixtureAssetDirectory, filename));
  return `data:${mimeType};base64,${image.toString('base64')}`;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
