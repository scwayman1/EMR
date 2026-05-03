#!/bin/bash
# Script to create a high-priority Linear ticket for Clerk Auth implementation

echo "Connecting to Linear MCP to create the Clerk authentication ticket..."

claude --permission-mode auto -p "Use the linear-server MCP to create a new issue with the following details:
- Title: 'Implement Clerk Authentication and Remove Legacy Fallback'
- Description: 'We need to fully implement Clerk for hosted authentication across the app and remove the legacy sign-in fallback UI. The environment currently shows a fallback message asking to set AUTH_PROVIDER=clerk. We need to finalize this integration.'
- Priority: High or Urgent
- Assignee/Label: Assign it to Scott (or add the label 'Scott' if assignee lookup fails).
Return the created ticket ID and URL so I can report it to the user."
