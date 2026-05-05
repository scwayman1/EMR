# LeafMart + Cannabis EMR — Prompt Sheet (Drop #11)

Verbatim capture of the two prompt batches Scott sent. The implementation
tickets live in `TICKETS.md` (EMR-231..EMR-257). The strategic framing
lives in `LEAFMART_STRATEGY.md`.

---

## Batch A — Cannabis EMR prompts

### Lab Sets
> Create labs option on clinician portal that a provider can easily click
> on "lab sets" or create lab sets that can be assigned to the patient's
> chart and then sent to either LabCorp or Quest along with the ICD-10
> coding and insurance information to make it easier for providers. For
> example, I see a patient every three months and we draw the same labs
> every time. Therefore I would want a workflow to be created that is
> similar to this: Patient is scheduled for an appointment in 2 weeks,
> I click on his chart, click on "standard lab order" button, which then
> generates a lab slip from either Quest or LabCorp that has the ICD
> codes such as I10, E11.9, E78.00, Z79.899 and marks off CBC with
> differential, lipid panel, A1C, GGT, and CMP. This should then be
> documented and placed in his chart, emailed to the patient or texted
> to the patient in the PDF form that is downloadable or printable
> (per patient preference) and then sent directly to Quest or LabCorp.
> The clinician should have the option to have multiple lab sets (for
> example one for routine follow up, another for physical exam, etc).

→ EMR-231

### Modular Prior-Auth + Peer-to-Peer API
> Create fully modular API that auto starts prior authorizations and
> peer-to-peer coordination for medications and procedures which can
> then be ran through the insurance database to determine best practices,
> determine which one gives the highest rate of approval. Make it so the
> doctor who is reviewing the chart and who is asking for the prior
> authorization can easily talk to one another or give a direct contact
> number (have it masked if the insurance company opts out). Create an
> interface that makes it easy to do both of these functions.

→ EMR-232

### AI Insurance Mediator (SheerHealth-style)
> Create API modular system that acts as a "mediator" between the doctor
> and the insurance company or the patient and the insurance company
> where the AI acts as the mediator who fights for approval of meds,
> procedures, and claims. Model this after https://www.sheerhealth.com/.

→ EMR-233

### AI Phone-Tree Navigator
> Create fully modular API system within app and EMR platform that is
> able to dial out and call any doctor's office, and use AI to be able
> to go through the phone tree and find the right number and option to
> call so the patient can save time versus waiting until someone picks
> up. Be able to place the call on hold or be able to call back once
> the call is ringing. Make it so in our app, they can dial the number
> and type in the name of the doctor, so when the phone tree says the
> right name, it automatically recognizes it and then connects to that
> number.

→ EMR-234

### Insurance Phone Directory
> Create full phone directory of insurance numbers (general inquiries,
> prior authorizations, pharmacy benefits, etc) that are beyond just the
> standard toll-free numbers and have them organized by city, county,
> and state. Try to make it as many direct numbers and local numbers to
> the patient's geolocation as possible. Many have to spend a lot of
> time clicking through a phone tree or talking to multiple people who
> continue to connect the patient to another number, and never then
> even getting it to go through. And if someone drops the call, they
> have to start over. We want them to be able to redial and pick up
> from where they started along with being able to get the appropriate
> number for their concerns. Use the back of all insurance cards as
> reference.

→ EMR-235

### Geolocated Legal Disclaimer
> Make sure all legal disclaimers are updated based on federal regulatory
> changes and make sure it is updated based on the latest changes in
> regulations in both state and federal. Make sure that there is a
> disclaimer that states before buying or using a cannabis product, it
> is important to talk to your medical provider along with checking the
> regulations in where they live (have it geolocated). Have the
> disclaimer have a little button that says "more information" which
> then opens a pop up window that is AI generated with all of the
> federal and state regulations around hemp and THC and recreational
> and medicinal regulations based on their geo location or if it is
> off, they can input their zip code.

→ EMR-236 (shared)

### Licensed Dispensary Registry
> For cannabis EMR, make sure to add license number for any cannabis
> pharmacy and dispensary that are officially and actively licensed by
> the state. Use these websites for now and we will continue to add more:
> https://cannabis.lacity.gov/personal-activity/find-licensed-retailers,
> https://www.huschblackwell.com/nationwide-cannabis-regulatory-map
> (make sure that the AI agents utilize every website based on the state
> off of this site), https://hemp.ams.usda.gov/s/PublicSearchTool,
> https://search.cannabis.ca.gov/, etc.

→ EMR-237 (shared)

### Year-End Cannabis Purchase Invoice
> For patient portal, make sure to create under "billing" tab an end-of-
> year invoice that has a summary of all of the cannabis products that
> a patient has purchased in that fiscal year, how much they paid,
> where they purchased it from, and the location they got it from.
> Create it so it can be used for insurance reimbursement along with
> tax purposes.

→ EMR-238

### State Hemp/THC Regulations Table
> For cannabis shop and for cannabis Rx module, create full backend
> table of state level regulations regarding hemp products, THC
> containing products, milligram cap on THC and hemp regulations. Make
> sure it includes all states and is updated based on different
> websites every week as things are changing quickly in this space.

→ EMR-239 (shared)

### Evidence-Backed Dosing Plan
> For dosing plan, create "peer reviewed research and scientifically
> backed evidence" dosing suggestion that is AI driven in different
> formats such as edible, flower, tincture, etc assuming that the
> patient is not currently taking any products. We want to remove the
> confusion from the patient if they don't know where to go or who to
> contact regarding the right cannabis strain or delivery option for
> them.

→ EMR-240 (shared)

### "How to Know What Product to Buy?" Education
> On education tab, under "learn" tab, create another box that says
> "how to know what product to buy?" and create resources that gives
> patients and consumers a list of questions to ask their dispensary
> along with certain things to look out for on the cannabis label (such
> as THC %, terpene amount and profile, COA, QR codes that can be
> scanned for further information, date of harvest, understanding
> milligrams and potency and how it differs based on different delivery
> methods (for example a 100mg tincture may be different than 100mg of
> an edible gummy), how to tell if a product is valid, legal, where
> does the product come from, etc.
> References: realmofcaring.org, thesanctuarygarden.co,
> weedmaps.com/learn, highprofilecannabis.com, ashesociety.com.

→ EMR-241 (shared)

---

## Batch B — LeafMart / Cannabis Shop prompts

### Domain + brand
> Make the website called: www.LeafMart.com.

→ EMR-242

### AI-driven compliance umbrella
> Create full AI system and have all AI agents start developing this
> website under legal and regulatory compliance measures from all
> overhead governing bodies. Use AI framework and AI agents to make
> sure that LeafMart is fully operating under a legal umbrella that is
> cross covered and within regulations of multiple governing bodies:
> FDA, federal, FCC, E-commerce regulations, etc. References:
> latchedagency.com, cdtfa.ca.gov, hybridmarketingco.com,
> covasoftware.com, 23state.com, convesio.com, spreecommerce.org.

→ EMR-243

### Shop infra + catalog (the BIG PRIORITY one)
> Start developing our cannabis store to be established as a store
> similar to Amazon where we are a site that hosts every cannabis
> product that we choose, and acts as a distribution site. The moment
> they click on the "store" a pop up menu should come up asking if they
> are 21 years or older with two buttons (one saying "yes" which takes
> them into the store and one saying "no" which then takes them to our
> landing page). It should be catered and built on the backbone of
> www.shopify.com and https://wpengine.com/ecommerce-solutions/, and
> www.soberish.com. Our shop shall serve as a site where all of the
> products can sit in a fully itemized fashion, have a beautiful,
> streamlined interface that has a small image of the product itself,
> the main phytocannabinoids in it, a simple ONE 10-word sentence about
> the product, type of product (edible, tincture, flower, topical, etc),
> the pricing, and then an option to click on the link for the product
> that will take them to the external website. The consumers and people
> shall transact DIRECTLY with our shop meaning we shall develop the
> full infrastructure to be able to house billing, collection of credit
> card information and have it connected to a major, well reputable and
> well known cannabis friendly bank in the USA. The customer shall
> transact directly with us and then our system shall pass the order
> to the company to fulfill the order automatically for packaging and
> shipping and handling. Invoices shall be created in our internal
> system which is then automatically sent to the customer and the
> company whose product we are hosting. For our store, create a "filter"
> button on the top right that patients can choose from price points
> (for example $0-20, $20-50, etc), type of cannabis product (edible,
> tincture, flower, etc), cannabinoid and terpenes that they are
> specifically looking for (CBD, CBG, etc, limonene, myrcene, etc).
>
> Replace above prompt to use SKU for product itemization on the shop
> and change it to the "UPC" number.

→ EMR-244

### LeafMart education mirror
> Replicate the "education" tab on www.LeafJourney.com and transfer it
> over to this new site along with all of its content.

→ EMR-245

### Login + account
> Create "login" button on top page for account so that people can
> create account and begin purchasing products.

→ EMR-246

### Account-linked EMR data transfer
> Make it so that the customer can connect their cannabis shop account
> directly to their www.LeafJourney.com medical record so their
> purchased data can be pulled directly into the EMR.

→ EMR-247

### Analytics + log-dose mirror
> Copy the coding and prompting for the Analytics lab, the "log your
> dose", the pain, anxiety, sleep scales, and the "log dose" aspects of
> LeafJourney.com and incorporate it exactly into LeafMart.

→ EMR-248

### Leaf rating (not stars)
> Instead of the Amazon star rating, create a "cannabis" leaf rating
> system along with reviews from consumers. When they log their rating,
> prompt them to check if it has helped them with certain measures such
> as it is helping with sleep, anxiety, stress, etc.

→ EMR-249

### De-identified data extrapolation
> Make it so all data from LeafMart can be extrapolated back into
> LeafJourney.com and can be de-identified. Use both websites to
> collect data.

→ EMR-250

### State-regulation filter
> Create filter system based on state regulations around THC amount,
> hemp, and if it is medicinal use state or recreational/adult state
> use only so it is in compliance with all governing bodies.

→ EMR-251

### Track-and-trace + quality analytics
> Make sure all AI agents create track and trace system to monitor
> sales, and determine high sales versus high quality product
> differentiation based on data and input from the consumers.

→ EMR-252

### "THE" site for trusted cannabis products
> BIG - PRIORITY - make this e-commerce website THE website for all
> trusted cannabis products that are both THC and non-THC related in a
> beautiful overlay and aesthetics similar to LeafJourney but different
> enough to have similarities to maintain brand cohesion but different
> enough to stand out as the store versus the EMR.

→ EMR-253

### Question-driven navigation
> BIG - PRIORITY - have all AI agents work under this question and gear
> the entire e-commerce website to solve this question: "where do I
> find the right cannabis product that I need for my specific ailments
> (such as insomnia, anxiety, stress, depression) that will work
> specifically for me and is backed by science and can give me a very
> clear guide on where to purchase it, what type of delivery method to
> purchase it in, and how to up titrate or down titrate the dose based
> on peer reviewed data, and science. Make it so this website is fully
> compliant with all governing bodies and is fully legal and that
> everyone is safe and legally protected (including the creators, the
> C-suite, the vendors, and the consumers). Make sure to scour the
> internet for all regulations and changes that occurs on a state and
> federal level and is updated weekly."

→ EMR-254

### Billing + digital receipts + tax aggregation
> Create billing for cannabis products that can be purchased directly
> from our shop, which then creates a digital receipt that consumer and
> the vendor receive and is stored and saved in the consumer's account
> information for tax purposes and reimbursement purposes at the end
> of the year.

→ EMR-255

### Supply chain API
> BIG - PRIORITY - create fully modular API supply chain model and
> integration from click of the product on the website to purchase
> based on state and county regulations.

→ EMR-256

### Veterinary cannabis shop
> Make sure there is a fully modular API driven veterinary cannabis
> shop that integrates directly into our shop and where we have another
> drop down option from the filter to do so.

→ EMR-257

---

## Cross-cutting note

Every prompt marked "shared" (EMR-236, EMR-237, EMR-239, EMR-240,
EMR-241) ships once and is consumed by both Leafjourney and LeafMart
through a shared regulatory / education / dispensary-registry package.
This keeps compliance in lockstep and prevents the two sites from
drifting on what a "licensed California retailer" or "current milligram
cap in Texas" means.
