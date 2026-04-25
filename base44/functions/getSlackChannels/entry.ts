import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { accessToken } = await base44.asServiceRole.connectors.getConnection('slackbot');

  let allChannels = [];
  let cursor = '';

  do {
    const url = `https://slack.com/api/conversations.list?limit=200&types=public_channel,private_channel${cursor ? `&cursor=${cursor}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await res.json();
    if (!data.ok) {
      return Response.json({ error: data.error, channels: [] });
    }
    allChannels = allChannels.concat(data.channels || []);
    cursor = data.response_metadata?.next_cursor || '';
  } while (cursor);

  return Response.json({
    channels: allChannels.map(c => ({ id: c.id, name: c.name }))
  });
});