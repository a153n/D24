# D24 Investment Chama

## Start the website

1. Open PowerShell in this folder.
2. Run `npm start`.
3. Open http://localhost:3000.

No `npm install` is required for this version because the browser loads the Supabase client from jsDelivr.

## Supabase setup

Run **supabase-complete.sql** in the Supabase SQL Editor. After creating the first account, run the owner update shown at the bottom of that SQL file.

The publishable Supabase key is safe to use in browser code. Never put a Supabase service-role/secret key in this project.

## If the page says Supabase failed to load

Check that the computer is online, because the Supabase browser library is loaded from jsDelivr.


### Owner-only project deletion
Only accounts with the `owner` role can delete project proposals. The Delete action is hidden from treasurers and members, and Supabase Row Level Security also blocks non-owners from deleting proposals. Deleting a project automatically deletes its attached votes because `proposal_votes.proposal_id` uses `ON DELETE CASCADE`.
