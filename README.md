# docsify-ai-chatbot

Add the [Asyntai](https://asyntai.com) AI chat assistant to your
[docsify](https://docsify.js.org) site. It answers reader questions from your
own docs, in more than 80 languages.

## Install

Add your widget ID to `window.$docsify`, then add the plugin script after
docsify:

```html
<script>
  window.$docsify = {
    name: 'My docs',
    asyntai: { widgetId: 'asyntai_1a2b3c4d5e6f' },
  };
</script>
<script src="//cdn.jsdelivr.net/npm/docsify@4"></script>
<script src="//cdn.jsdelivr.net/npm/docsify-ai-chatbot@1"></script>
```

It works the same with docsify 5:

```html
<script src="//cdn.jsdelivr.net/npm/docsify@5/dist/docsify.min.js"></script>
<script src="//cdn.jsdelivr.net/npm/docsify-ai-chatbot@1"></script>
```

Open your site. The chat bubble is on every page.

## Where the widget ID comes from

Open the Install page in your [Asyntai dashboard](https://asyntai.com/dashboard).
The widget ID is the value of `data-asyntai-id` in the snippet shown there. It
starts with `asyntai_`.

Creating an account is free, and the Free plan is enough to try the widget.

## Options

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `widgetId` | string | required | Your Asyntai widget ID |
| `scriptUrl` | string | the Asyntai CDN | Advanced. Load the widget from another URL |

The short form `asyntai: 'asyntai_1a2b3c4d5e6f'` works too.

A missing or malformed widget ID never breaks your docs. The site renders as
usual and the browser console says how to fix the setting.

## What the plugin does

- It loads the Asyntai widget once, after docsify has shown the first page.
- It waits for the page's `load` event, so your docs always render first.
- docsify changes pages without a reload, so the chat stays open with its
  conversation while the reader moves around the docs.
- A page that already has the Asyntai snippet keeps it and gets no second one.

It works with docsify 4 and 5, and with a `window.$docsify` function config.

## Answering from your docs

Asyntai reads your published pages. Add your docs URL in the dashboard, and the
assistant answers from the same pages the widget sits on. You can also add extra
documents and question and answer pairs.

## Removing it

Delete the plugin `<script>` line. The widget is gone.

## Support

Email [hello@asyntai.com](mailto:hello@asyntai.com), or read the
[docsify guide](https://asyntai.com/documentation/integrations/docsify/).

## Licence

MIT. See [LICENSE](LICENSE).
