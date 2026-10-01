---
title: "Finding order where there seem to be None"
description: "Finding the logical order for a data migration with foreign keys, system views, and a recursive SQL query."
date: "2025-11-30T14:00:16.000+00:00"
tags: ["sql-server","data-migration"]
image: "/assets/images/blog/finding-order/cover.png"
image_width: 1280
image_height: 719
image_alt: "Cover illustration for Finding order where there seem to be None"
source_url: "https://www.linkedin.com/feed/update/urn:li:activity:7400896452279017472/"
source_article_url: "https://www.linkedin.com/pulse/finding-order-where-seem-none-pezhman-aliabadi-gkqif"
---

That is pretty much the name of the game when you want to pipeline data into a highly interrelated data model. In other words, you need to know in what order you should import the data so it would satisfy your foreign key constraints. Even simpler put, if table B references table A, you need to migrate data from table A before B, so when you want to import the record ‘b, record ‘a’ already exists, otherwise migration of table B would raise the infamous Foreign Key error.

<figure>
  <img src="{{ '/assets/images/blog/finding-order/figure-1.png' | relative_url }}" alt="A foreign key relationship from table B to table A" loading="lazy">
  <figcaption>Given the relationship, you can only insert &#39;b&#39; if &#39;a&#39; is present.</figcaption>
</figure>

## Start with the dependencies

One way to do it would be to drop / deactivate all dependencies altogether and reinstate them after the migration process, another would be to brute force the whole process, by which I mean to try each step until it finally succeeds. but these are prone to errors, scale poorly and altogether bad practices.

Alternatively, if you could break the whole process in several logical steps from A to Z, where for each step, all the prerequisites have already been satisfied in the preceding steps, you would never have to worry about any relational constraint holding you down.

But how can we figure out this logical order in a tangled model such as this?

<figure>
  <img src="{{ '/assets/images/blog/finding-order/figure-2.png' | relative_url }}" alt="AdventureWorks2017 data model and its table relationships" loading="lazy">
  <figcaption>data model from AdventureWorks2017</figcaption>
</figure>

In this near-real-world example, even figuring out where to start is not an easy task, let alone the logical order one should follow, in order to migrate data without having to deal with the headache that is “The dependencies”.

## Find the migration order with SQL

It is obvious that the key lies in those ever so intersecting lines drawn between each table, that signifies the relationship between them. Fortunately, with the use of system views (that store information pertaining to those relationships) and some intuition, we could find the answer to our dilemma the below code:

```sql
WITH fks AS (
	SELECT  
		obj.name AS fk_name,
		sch.name AS source_schema,
		tab1.name AS source_table,
		tab2.name AS target_table
	FROM sys.foreign_key_columns fkc
	INNER JOIN sys.objects obj
		ON obj.object_id = fkc.constraint_object_id
	INNER JOIN sys.tables tab1
		ON tab1.object_id = fkc.parent_object_id
	INNER JOIN sys.schemas sch
		ON tab1.schema_id = sch.schema_id
	INNER JOIN sys.tables tab2
		ON tab2.object_id = fkc.referenced_object_id
),


cte AS (
	SELECT 
		t.table_schema AS source_schema,
		t.table_name AS source_table,
		CONVERT(NVARCHAR(50), '') AS target_schema,
		CONVERT(NVARCHAR(50), '') AS target_table,
		1 as lvl
	FROM INFORMATION_SCHEMA.TABLES AS t
	LEFT OUTER JOIN fks AS f
		ON f.source_table = t.table_name
	WHERE f.source_table IS NULL

UNION ALL

	SELECT
	    f.source_schema AS source_schema,
	    f.source_table AS source_table,
	    CONVERT(NVARCHAR(50), c.source_schema) AS target_schema,
	    CONVERT(NVARCHAR(50), c.source_table) AS target_table,
	    c.lvl + 1 as lvl
	FROM cte AS c
	INNER JOIN fks AS f
		ON f.target_table = c.source_table
	WHERE f.source_table != c.source_table
)

SELECT 
	c.source_schema, 
	c.source_table, 
	MAX(c.lvl) AS orderNo
FROM cte AS c
GROUP BY c.source_schema, c.source_table
ORDER BY 3 ASC
```

You can also use these links for a more up to date version if there were any changes in the future for both [SQL Server](https://github.com/Pejhan/useful_sql_scripts/blob/main/LogicalOrderOfMigration_MSSQL.sql) and [Postgres](https://github.com/Pejhan/useful_sql_scripts/blob/main/LogicalOrderOfMigration_Postgres.sql).

## Read the result

The result of this query yields the following:

<figure>
  <img src="{{ '/assets/images/blog/finding-order/figure-3.png' | relative_url }}" alt="Tables grouped by their migration order" loading="lazy">
</figure>

which tells us that in order to successfully sync migrate data from tables from orderNo = 2, we must first migrate tables from the group with orderNo = 1.

The query starts with tables with no dependency with any other (as the anchor member of the CTE), assigns the value 1 to their Level, then recursively looks ahead to see what tables rely on tables from the previous level and so on. In the end, we assign the biggest dependence level of each table as its orderNo. Everything else is what you might expect from a standard Recursive CTE, the only thing that might seem unique is this predicate in the recursive member of the CTE:

```sql
WHERE f.source_table != c.source_table
```

which makes sure that in case of a self relation in the model, the query doesn't exhaust the recursion limit.

There is a scenario where a table might be in an indirect relation loop to itself, which I will cover in a later post.

---

This is a pretty nifty way of sorting you model logically that can help you in different scenarios. Let me know if you have any questions or pointers. 👨💻
