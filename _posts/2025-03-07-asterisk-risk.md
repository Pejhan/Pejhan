---
title: "Asterisk Risk ✨: Avoid using '*' in your SQL code"
description: "How SELECT * can hide a schema change in a SQL Server view, and how explicit columns and schema binding help."
date: "2025-03-07T14:48:57.000+00:00"
tags: ["sql-server","sql"]
image: "/assets/images/blog/asterisk-risk/cover.png"
image_width: 1171
image_height: 658
image_alt: "Cover illustration for Asterisk Risk: Avoid using an asterisk in SQL"
source_url: "https://www.linkedin.com/feed/update/urn:li:activity:7303788755268591617/"
source_article_url: "https://www.linkedin.com/pulse/asterisk-risk-avoid-using-you-sql-code-pezhman-aliabadi-kkggf"
---

Back when I was learning SQL and the intricacies of its simple yet powerful syntax, I always wondered why some approaches were regarded as bad practice. It was hard enough to grasp the concept, let alone the minute details that came with it. As the years passed, I gradually realized that in the realm of programming, there’s a solid reason behind each and every best practice. Ignoring these suggestions will evidently lead to undesired behaviors when you least expect it.

In this article, I’d like to talk about a recent issue I encountered, namely, the use of `*` in the column list of a SQL script. Most of you developers out there already know why this can lead to problems later on. For one, your script may suffer from performance issues. When you fetch more columns than you need, you inadvertently consume more memory, more network bandwidth, and demand heavier I/O operations from the database engine. Additionally, you steer the engine away from using the proper index, which in turn leads to a poor performing execution plan.

Another significant issue is that your code becomes prone to bugs and unexpected behaviors. Let’s see how that can happen.

---

## A simple table and view

Consider a simple table with test data:

```sql
create table [Table] (
	id int,
	text nvarchar(max),
	date date,
	bool bit
);

insert [Table]
values
	(1, 'record1', '2025-01-01', 0),
	(2, 'record2', '2025-02-03', 1),
	(3, 'record3', '2025-02-07', 1);
```

Then, we create a very simple view:

```sql
create view [View]
as
       select *
       from [Table];
```

Pretty harmless, right?

So far, everything is in order. Selecting from the table and the view gives you the exact same result:

<figure>
  <img src="{{ '/assets/images/blog/asterisk-risk/figure-1.png' | relative_url }}" alt="The original table and view return matching rows and columns" loading="lazy">
</figure>

## A small schema change

At some point during a schema migration, our table undergoes a minor change, one that normally should not break any code:

```sql
alter table [Table]
drop column text;

alter table [Table]
add [text] nvarchar(max) ;
```

Then, the data for the text column is repopulated using the backup we procured during the migration process. It would look something like this:

```sql
update t
set t.[text] = b.[text]
from [Table] t
inner join [bk_Table] b
	on t.id = b.id
```

A quick look at the table shows that everything has gone smoothly:

<figure>
  <img src="{{ '/assets/images/blog/asterisk-risk/figure-2.png' | relative_url }}" alt="The table after the text column was dropped and recreated" loading="lazy">
</figure>

nothing significant has changed, except for the visual order of columns. So, there’s pretty much nothing to worry about.

I’m sure View is also unaffected by this change:

<figure>
  <img src="{{ '/assets/images/blog/asterisk-risk/figure-3.png' | relative_url }}" alt="The view shows values under outdated column names" loading="lazy">
</figure>

## Why the view gets it wrong

Wait, what? How can this be correct?

The bool column, which is expected to hold Boolean values, is now showing strings. The text column is showing dates, and the date column is showing integers! What happened?

If you look closely, the data Looks the same as the Table, but the column names follow the order from before the migration. In other words, the view has no idea that the table has changed. It still assumes the second column is text, even though text has moved to the fourth position.

During the parsing stage, since the view finds the columns it expects, it doesn’t inform you of this change, because it is unaware of it.

## Refresh the view

We can run the following query to rebuild the view and sync it with the altered table:

```sql
EXEC sys.sp_refreshview N'[View]'
```

Granted, this fixes the problem, but we wouldn’t have known that the view needed a refresh until just now. To avoid such pitfalls, it’s best to prevent them altogether.

## Prevent the problem

For starters, never use `SELECT "*"` in production code. It’s fine during development, but before deploying to a production environment, you must replace `"*"` with an explicit column list.

Another safeguard is to use the WITH SCHEMABINDING option. This ensures that any change to an underlying table that would break a view triggers an error, instead of silently corrupting the view:

```sql
create or alter view [View]
with schemabinding
as
       select [id], [date], [text], [bool]
       from dbo.[Table];
```

If someone tries to drop or modify a dependent column, SQL Server will return an error:

```text
SQL Error [5074] [S0001]: The object 'View' is dependent on column 'text'.
```

And they need to take action accordingly. This way all changes will be managed at migration phase, rather than later on production or debugging phase.

---

I seldom stopped to think about how following guidelines and looking for best practices can save me hours of head scratch. I used to pride myself with following naming conventions, good coding conventions etc. but as it turns out there's still room for improvement and there are other concepts that I need to read up on to become more adept at what I do. Have you ever had a similar experience while working with SQL database?

## A note about PostgreSQL

EDIT:

As [Kamran Abdi](https://ir.linkedin.com/in/kamran-abdi-1582b514a?trk=article-ssr-frontend-pulse_little-mention) pointed out, such error would not raise in PostgreSQL as the it either terminates or cascades (based on developer's choice) the change so as to not lead to any unexpected breaking of code.

So the specific scenario that was discussed, applies to but might not be limited to SQL Server.

 
