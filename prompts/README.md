# Prompts

Prompts to build an app with iavica using any AI assistant. Describe your app in your own words and keep
**the iavica sentence** at the end: it sends the AI to the instructions it needs.

## The iavica sentence

```text
Build my app using iavica. Follow https://iavica.com/ai to connect secure storage and publish it online.
When it's ready, explain the next steps to me with the messages from that page.
```

## Example prompts

Copy one, change what you like, and paste it into your AI.

**Invoices (United States)**: the prompt behind [My Invoices](../examples/my-invoices)
```text
Make me a small invoicing app, in English, in US dollars and adapted to the United States. I want to add
my clients and my products and create invoices. It should have my list of invoices and let me export them
to PDF. It should work well on a phone. It should come with sample data already loaded.
Build my app using iavica. Follow https://iavica.com/ai to connect secure storage and publish it online.
When it's ready, explain the next steps to me with the messages from that page.
```

**Shopping list to share with family**
```text
Make me a simple shopping list that my family can share: add items, tick them off when bought, and clear
the bought ones. It should work well on a phone.
Build my app using iavica. Follow https://iavica.com/ai to connect secure storage and publish it online.
When it's ready, explain the next steps to me with the messages from that page.
```

**Family expenses**
```text
Make me an app to track our family expenses by month and category, with a summary chart and totals per
person. Amounts in euros.
Build my app using iavica. Follow https://iavica.com/ai to connect secure storage and publish it online.
When it's ready, explain the next steps to me with the messages from that page.
```

**Habit tracker**
```text
Make me a habit tracker: I define my habits, tick them each day, and see my streaks and a calendar of the
month.
Build my app using iavica. Follow https://iavica.com/ai to connect secure storage and publish it online.
When it's ready, explain the next steps to me with the messages from that page.
```

**Bookings for a small business**
```text
Make me an app to manage the appointments of my hair salon: clients, services with prices and duration,
and a weekly calendar of appointments. Private: only my staff and I can open it.
Build my app using iavica. Follow https://iavica.com/ai to connect secure storage and publish it online.
When it's ready, explain the next steps to me with the messages from that page.
```

## Which assistant, and what to expect

| Assistant | What happens |
|---|---|
| **Claude Code and other coding agents that can make web requests** | The AI builds the app and can **publish it for you**: you get an email from iavica, press **Approve**, and the page shows an **Open my app** button. |
| **ChatGPT, Gemini, Claude (chat apps)** | The AI gives you the HTML file. Open it on your computer: it asks for your email once. To have it on your phone, go to [iavica.com/account](https://iavica.com/account) and drag the file there. |

If your AI cannot open iavica.com/ai, it can use the short version at the end of the
[iavica.com](https://iavica.com) home page ("For AI assistants") or [`AI_GUIDE.md`](../AI_GUIDE.md).

## Changing an app later

Give your AI the current file and say what to change. Your data stays: iavica's guide tells the AI to keep
the app's `appId` and the names of the saved data. For example:

```text
Here is my app. Add a "notes" field to each client and a filter by status in the invoice list.
Keep it working with iavica as before.
```

## When something breaks

If the app hits an error, iavica shows a dialog with a ready-made message. Copy it into the AI that wrote
the app and ask it for the corrected file.

## License

These prompts are CC BY 4.0: reuse and adapt them freely, crediting iavica.com.
