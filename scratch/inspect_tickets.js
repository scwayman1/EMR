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

const query = `
query GetIssues {
  issue(id: "EMR-780") {
    id
    identifier
    title
    description
    team {
      id
    }
    project {
      id
    }
    state {
      id
      name
    }
  }
  issue2: issue(id: "EMR-781") {
    id
    identifier
    title
    description
    team {
      id
    }
    project {
      id
    }
    state {
      id
      name
    }
  }
}
`;

async function run() {
  try {
    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": apiKey
      },
      body: JSON.stringify({ query })
    });
    const json = await res.json();
    console.log("Ticket details:", JSON.stringify(json.data, null, 2));
  } catch (err) {
    console.error("Failed to query Linear:", err);
  }
}

run();
