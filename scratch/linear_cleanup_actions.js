const fs = require('fs');
const path = require('path');

// Load environment variables manually from .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([^#\s=]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1];
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const apiKey = process.env.LINEAR_API_KEY;
if (!apiKey) {
  console.error("LINEAR_API_KEY is not defined in .env");
  process.exit(1);
}

const TEAM_ID = "271a109c-67d1-4332-a977-5f310720b0c6";
const PROJECT_ID = "2159d25b-39de-46f4-88bd-5c503b77dfa2";
const STATE_ID = "fe8be6c4-1d4a-4d12-88c0-8e378272ab94"; // Backlog

const MUTATION_UPDATE = `
mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
  issueUpdate(id: $id, input: $input) {
    success
    issue {
      id
      identifier
      title
    }
  }
}
`;

const MUTATION_CREATE = `
mutation CreateIssue($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    success
    issue {
      id
      identifier
      title
    }
  }
}
`;

async function makeRequest(query, variables) {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": apiKey
    },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }
  return json.data;
}

async function run() {
  console.log("Starting cleanup and splitting of redundant prompts...");
  
  // 1. Update EMR-780 to be ONLY about Birthday popup/emoji
  console.log("Updating EMR-780...");
  const desc780 = `## Goal
Implement a celebratory birthday popup and chart indicator to highlight a patient's birthday.

## Prompt
When it's the patient's birthday, create a pop up window with a celebratory feel and small visuals and graphics to remind the patient and the staff that it's the patient's birthday. Put a little emoji on their chart that is "birthday cake", "birthday hat", etc. so that it stays on there throughout the day. Remove this icon and feature at 0001 on the following day.

## Intake Metadata
* Source: Google Chat HTTPS relay
* Space: Product Prompts (spaces/AAQAxDxDxT0)
* Original Thread: spaces/AAQAxDxDxT0/threads/lGJZLtpeR_E`;

  await makeRequest(MUTATION_UPDATE, {
    id: "EMR-780",
    input: {
      title: "EMR: Patient birthday popup and chart cake/hat emoji",
      description: desc780
    }
  });
  console.log("EMR-780 updated successfully.");

  // 2. Create native AI scribe ticket (Heidi AI reference)
  console.log("Creating Heidi AI Scribe ticket...");
  const descHeidi = `## Goal
Build out the native AI scribe platform, referencing Heidi AI.

## Prompt
Build our AI voice transcription model and reference "Heidi" AI as part of our native AI scribe platform. Reference website: https://www.heidihealth.com/en-us

## Intake Metadata
* Source: Google Chat HTTPS relay (split from spaces/AAQAxDxDxT0/threads/lGJZLtpeR_E)`;
  
  const resHeidi = await makeRequest(MUTATION_CREATE, {
    input: {
      title: "EMR: Native AI scribe platform integration (Heidi AI reference)",
      description: descHeidi,
      teamId: TEAM_ID,
      projectId: PROJECT_ID,
      stateId: STATE_ID
    }
  });
  console.log(`Created: ${resHeidi.issueCreate.issue.identifier}`);

  // 3. Create Premium AI RCM ticket
  console.log("Creating RCM ticket...");
  const descRcm = `## Goal
Design and build a next-generation Revenue Cycle Management (RCM) system that prioritizes usability, simplicity, and visual elegance.

## Prompt
For our revenue management model on the backend, we want it to rival all of the competitors: R1 RCM, Oracle, Optum, Experian, Veradigm, Cognizant, Athenahealth, Epic. We should be able to do it better than all of these competitors, with more user engagement, and enjoyment to use our platform. Let's make it clear: our AI revenue management model isn't only to compete, but to be enjoyed and easy to use. The usability, simplicity, elegance, and visual aesthetic of our EMR and revenue management model is top priority.
References:
* https://www.r1rcm.com/
* https://www.athenahealth.com/solutions/revenue-cycle-management
* https://www.oracle.com/financial-services/revenue-management-pricing/
* https://www.experian.com/healthcare/solutions/revenue-cycle-management-solution

## Intake Metadata
* Source: Google Chat HTTPS relay (split from spaces/AAQAxDxDxT0/threads/lGJZLtpeR_E)`;

  const resRcm = await makeRequest(MUTATION_CREATE, {
    input: {
      title: "RCM: Premium AI Revenue Cycle Management module UI/UX",
      description: descRcm,
      teamId: TEAM_ID,
      projectId: PROJECT_ID,
      stateId: STATE_ID
    }
  });
  console.log(`Created: ${resRcm.issueCreate.issue.identifier}`);

  // 4. Create AI disclaimer ticket
  console.log("Creating AI disclaimer ticket...");
  const descDisclaimer = `## Goal
Ensure clear audit trail and patient disclaimer inclusion for ambient/AI voice transcription.

## Prompt
BIG - URGENT, Important - make sure that whenever any document in our system is used with our AI recording or AI voice/ambient recording, that we have a disclaimer and a statement in the notes and the messages that is along the lines of "AI was used to document and scribe the patient encounter. Patient was informed and gave verbal consent agreeing on its use."

## Intake Metadata
* Source: Google Chat HTTPS relay (split from spaces/AAQAxDxDxT0/threads/lGJZLtpeR_E)`;

  const resDisclaimer = await makeRequest(MUTATION_CREATE, {
    input: {
      title: "EMR: Patient verbal consent disclaimer for AI recording/ambient scribe",
      description: descDisclaimer,
      teamId: TEAM_ID,
      projectId: PROJECT_ID,
      stateId: STATE_ID
    }
  });
  console.log(`Created: ${resDisclaimer.issueCreate.issue.identifier}`);

  // 5. Update EMR-781 to be ONLY about CURES plugin (with full prompt details)
  console.log("Updating EMR-781...");
  const desc781 = `## Goal
Implement a "CURES" database plugin for controlled substance prescribing, including interactive warnings and smart-text insertion via "/__".

## Prompt
BIG - PRIORITY- create a "CURES" database plug in that allows the provider to access CURES data directly from our EMR so that the provider can easily document all aspects required when prescribing or reviewing controlled substances, which include "documentation of prescribing substances", drug-drug interactions, no operating of heavy machinery or driving, Narcan prescribed, side effects discussed. We want this to be easy for the provider so make a way to create this plugin and have a simple "/__" phrase that can easily document all of these aspects required when prescribing these controlled substances.
Make sure it includes these parts of it:
> "Cures data reviewed. Drug-drug interactions with the controlled substances prescribed discussed in detail. Stressed the importance of no driving or operating heavy machinery while under the influence of these substances. Discussed importance of weaning off immediately and that these types of medications are primarily for short term use. Pt comprehended all information and agreed with current medication regimen and plan."

Have AI scour the internet to make sure that we are in full compliance and not missing any other documentation wording. And also make sure to document "Narcan" prescribed if an opioid was prescribed.

## Intake Metadata
* Source: Google Chat HTTPS relay
* Space: Product Prompts (spaces/AAQAxDxDxT0)
* Original Thread: spaces/AAQAxDxDxT0/threads/_R3BwyoGJ78`;

  await makeRequest(MUTATION_UPDATE, {
    id: "EMR-781",
    input: {
      title: "EMR: CURES database integration plugin and '/__' documentation shortcut",
      description: desc781
    }
  });
  console.log("EMR-781 updated successfully.");

  // 6. Create Chart Download ticket
  console.log("Creating Chart Download ticket...");
  const descDownload = `## Goal
Build capabilities to print and export patient charts into physical media and custom format.

## Prompt
BIG - PRIORITY- create ability for a patient to fully "download" a patient's chart as a hard copy onto a CD or flash drive. Be able to export it into a proprietary extension for the file such as extension ".lfj" file. Be able to "print" any part of the patient's chart with all of the identifier information in a printable/PDF format. There should be optionality to "print" any part of the documents, patient charts, trend information, lifestyle measures and metrics, etc.

## Intake Metadata
* Source: Google Chat HTTPS relay (split from spaces/AAQAxDxDxT0/threads/_R3BwyoGJ78)`;

  const resDownload = await makeRequest(MUTATION_CREATE, {
    input: {
      title: "EMR: Export and print patient chart (.lfj and PDF/CD/flash drive)",
      description: descDownload,
      teamId: TEAM_ID,
      projectId: PROJECT_ID,
      stateId: STATE_ID
    }
  });
  console.log(`Created: ${resDownload.issueCreate.issue.identifier}`);

  // 7. Create RBAC / Chart privacy permissions ticket
  console.log("Creating RBAC/privacy ticket...");
  const descRbac = `## Goal
Implement granular role-based access control (RBAC) on chart visibility and modification, and give patients the option to restrict chart views.

## Prompt
Create an option where there is a way for the provider and patient to have the right to determine who can view his chart or which ancillary staff can review his chart. For example there are paranoid patients who may not like the nurses and the office staff to be able to review his chart and only want his doctor to be able to review it. Give the administrator control on what parts of the chart are accessible to which staff members. For example "front office" may only have access to the demographics section and billing whereas the "back office" may only have access to the chart, not sensitive information, etc. Also create the full optionality of what the office and providers can either "add", "upload", "view", or "edit" parts of the chart. For example the staff may only have "read only" rights on the chart whereas a midlevel provider may have abilities to "add" and "edit" the chart.

## Intake Metadata
* Source: Google Chat HTTPS relay (split from spaces/AAQAxDxDxT0/threads/_R3BwyoGJ78)`;

  const resRbac = await makeRequest(MUTATION_CREATE, {
    input: {
      title: "EMR: Granular chart access control & staff permissions (RBAC)",
      description: descRbac,
      teamId: TEAM_ID,
      projectId: PROJECT_ID,
      stateId: STATE_ID
    }
  });
  console.log(`Created: ${resRbac.issueCreate.issue.identifier}`);

  console.log("\nCleanup successfully completed!");
}

run().catch(console.error);
