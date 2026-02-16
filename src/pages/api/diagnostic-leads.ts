export const prerender = false;

import type { APIRoute } from 'astro';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: import.meta.env.NOTION_TOKEN });
const databaseId = import.meta.env.NOTION_LEADS_DB_ID;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, company, name } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!databaseId) {
      console.error('NOTION_LEADS_DB_ID is not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Email: {
          title: [{ text: { content: email } }],
        },
        Company: {
          rich_text: [{ text: { content: company || '' } }],
        },
        Name: {
          rich_text: [{ text: { content: name || '' } }],
        },
        Source: {
          select: { name: 'Diagnostic Page' },
        },
        Date: {
          date: { start: new Date().toISOString().split('T')[0] },
        },
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error saving lead:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
