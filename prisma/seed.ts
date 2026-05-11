import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // 1 — Organization
  const org = await prisma.organization.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corp",
      slug: "acme-corp",
      plan: "FREE",
    },
  });

  // 3 Users
  const ownerHash = await hash("password123", 12);
  const owner = await prisma.user.upsert({
    where: { email: "owner@acme.com" },
    update: {},
    create: {
      email: "owner@acme.com",
      name: "Mario Rossi",
      passwordHash: ownerHash,
      role: "OWNER",
      organizationId: org.id,
    },
  });

  const sales = await prisma.user.upsert({
    where: { email: "sales@acme.com" },
    update: {},
    create: {
      email: "sales@acme.com",
      name: "Giulia Bianchi",
      passwordHash: await hash("password123", 12),
      role: "SALES",
      organizationId: org.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "viewer@acme.com" },
    update: {},
    create: {
      email: "viewer@acme.com",
      name: "Luca Verdi",
      passwordHash: await hash("password123", 12),
      role: "VIEWER",
      organizationId: org.id,
    },
  });

  // 1 Pipeline with 5 stages
  const pipeline = await prisma.pipeline.create({
    data: {
      name: "Pipeline Principale",
      organizationId: org.id,
      isDefault: true,
      position: 0,
      stages: {
        create: [
          { name: "Qualificazione", position: 0, probability: 20, rotting: 14 },
          { name: "Contatto", position: 1, probability: 40, rotting: 10 },
          { name: "Proposta", position: 2, probability: 60, rotting: 7 },
          { name: "Negoziazione", position: 3, probability: 80, rotting: 5 },
          { name: "Chiusura", position: 4, probability: 95, rotting: 3 },
        ],
      },
    },
    include: { stages: { orderBy: { position: "asc" } } },
  });

  const stages = pipeline.stages;

  // 10 Companies
  const companyNames = [
    "TechSolutions Srl", "Global Industries SpA", "Innovatech Srl",
    "Alpha Services", "Beta Consulting", "Gamma Corp",
    "Delta Systems", "Epsilon Group", "Zeta Holdings", "Eta Partners",
  ];
  const companies = await Promise.all(
    companyNames.map((name, i) =>
      prisma.company.create({
        data: {
          name,
          industry: ["Software", "Manifattura", "Consulenza", "Finanza", "Retail"][i % 5],
          size: ["1-10", "11-50", "51-200", "201-1000"][i % 4],
          organizationId: org.id,
        },
      }),
    ),
  );

  // 20 Contacts
  const firstNames = ["Marco", "Sara", "Luca", "Anna", "Paolo", "Marta", "Giorgio", "Elena", "Fabio", "Chiara",
                       "Roberto", "Valentina", "Andrea", "Alessia", "Matteo", "Sofia", "Davide", "Laura", "Simone", "Francesca"];
  const lastNames = ["Ferrari", "Russo", "Bianchi", "Romano", "Esposito", "Ricci", "Marino", "Greco", "Bruno", "Gallo",
                      "Conti", "De Luca", "Colombo", "Mancini", "Costa", "Giordano", "Rizzo", "Lombardi", "Moretti", "Barbieri"];

  const contacts = await Promise.all(
    firstNames.map((firstName, i) =>
      prisma.contact.create({
        data: {
          firstName,
          lastName: lastNames[i] ?? "Rossi",
          email: `${firstName.toLowerCase()}.${(lastNames[i] ?? "rossi").toLowerCase()}@example.com`,
          phone: `+39 33${i} ${Math.floor(1000000 + Math.random() * 9000000)}`,
          jobTitle: ["CEO", "CTO", "Sales Manager", "CFO", "Marketing Manager"][i % 5],
          organizationId: org.id,
          ownerId: i % 2 === 0 ? owner.id : sales.id,
          companyId: companies[i % companies.length]?.id,
        },
      }),
    ),
  );

  // 30 Deals distributed across stages
  const dealTitles = [
    "Implementazione CRM", "Progetto ERP", "Consulenza IT", "Sviluppo App Mobile",
    "Migrazione Cloud", "Sistema BI", "Piattaforma E-commerce", "Automazione Marketing",
    "Integrazione API", "Sicurezza Informatica", "Dashboard Analytics", "Software HR",
    "Gestione Inventario", "Portale Clienti", "Formazione Digitale",
  ];

  await Promise.all(
    Array.from({ length: 30 }, (_, i) => {
      const stage = stages[i % stages.length];
      const contact = contacts[i % contacts.length];
      if (!stage || !contact) return Promise.resolve();
      return prisma.deal.create({
        data: {
          title: `${dealTitles[i % dealTitles.length]} - ${contact.firstName}`,
          value: Math.round((Math.random() * 50000 + 5000) * 100) / 100,
          currency: "EUR",
          status: "OPEN",
          pipelineId: pipeline.id,
          stageId: stage.id,
          organizationId: org.id,
          ownerId: i % 2 === 0 ? owner.id : sales.id,
          contactId: contact.id,
          companyId: contact.companyId,
          expectedClose: new Date(Date.now() + (30 + i * 7) * 24 * 60 * 60 * 1000),
        },
      });
    }),
  );

  console.log("✅ Seed completato!");
  console.log("   Org:      Acme Corp (slug: acme-corp)");
  console.log("   Utenti:   owner@acme.com / sales@acme.com / viewer@acme.com (password: password123)");
  console.log("   Pipeline: 1 con 5 stage");
  console.log("   Contatti: 20 | Aziende: 10 | Affari: 30");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
