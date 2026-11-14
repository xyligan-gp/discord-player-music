// Fake yt-dlp for tests: prints JSON like the real one
const args = process.argv.slice(2);
const first = args[0] ?? '';

if(first.startsWith('ytsearch')) {
    const limit = Number(first.match(/^ytsearch(\d+):/)?.[1] ?? 1);

    for(let i = 1; i <= limit; i++) console.log(JSON.stringify({ id: `search${i}__`, title: `Result ${i}`, duration: 100 + i, channel: 'Channel', channel_url: 'https://youtube.com/c/x', thumbnail: 'https://i.ytimg.com/x.jpg' }));
}else if(first.includes('playlist?list=')) {
    const end = Number(args[args.indexOf('--playlist-end') + 1] ?? 100);

    for(let i = 1; i <= Math.min(end, 4); i++) console.log(JSON.stringify({ id: `plvideo${i}__`, title: i === 3 ? '[Private video]' : `Video ${i}`, duration: i === 3 ? null : 60 * i, channel: 'Channel', playlist_title: 'My playlist' }));
}else if(first.includes('signin')) {
    console.error("ERROR: [youtube] abc: Sign in to confirm you're not a bot");
    process.exit(1);
}else if(first.includes('fail')) {
    console.error('ERROR: Video unavailable');
    process.exit(1);
}else console.log(JSON.stringify({ id: 'abcdefghijk', title: 'Resolved', duration: 42, uploader: args.includes('--cookies') ? args[args.indexOf('--cookies') + 1] : 'Uploader' }));
