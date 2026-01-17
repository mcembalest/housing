import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import {
  CustomDataSourceRow,
  rowToCustomSource,
  CustomSourceUpdateRequest,
} from '@/lib/types/customSource';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/custom-sources/[id] - Get a single custom source
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const sql = neon(process.env.DATABASE_URL!);

    // Support both UUID (sourceId) and numeric (id) lookups
    const isUUID = id.includes('-');
    const result = isUUID
      ? await sql`SELECT * FROM custom_data_sources WHERE source_id = ${id}::uuid`
      : await sql`SELECT * FROM custom_data_sources WHERE id = ${parseInt(id, 10)}`;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Custom source not found' },
        { status: 404 }
      );
    }

    const source = rowToCustomSource(result[0] as CustomDataSourceRow);

    // Return without internal id (only sourceId)
    return NextResponse.json({
      source: {
        sourceId: source.sourceId,
        provider: source.provider,
        providerSourceId: source.providerSourceId,
        title: source.title,
        description: source.description,
        unit: source.unit,
        providerTitle: source.providerTitle,
        providerUnits: source.providerUnits,
        providerFrequency: source.providerFrequency,
        validationStatus: source.validationStatus,
        lastValidationError: source.lastValidationError,
        lastValidatedAt: source.lastValidatedAt,
        frequency: source.frequency,
        staleAfterHours: source.staleAfterHours,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching custom source:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch custom source' },
      { status: 500 }
    );
  }
}

// PUT /api/custom-sources/[id] - Update metadata (title, description, unit only)
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: CustomSourceUpdateRequest = await request.json();
    const { title, description, unit } = body;

    // At least one field must be provided
    if (!title && description === undefined && !unit) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: 'At least one field (title, description, unit) must be provided' },
        { status: 400 }
      );
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Support both UUID (sourceId) and numeric (id) lookups
    const isUUID = id.includes('-');

    // Check if source exists
    const existing = isUUID
      ? await sql`SELECT id FROM custom_data_sources WHERE source_id = ${id}::uuid`
      : await sql`SELECT id FROM custom_data_sources WHERE id = ${parseInt(id, 10)}`;

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Custom source not found' },
        { status: 404 }
      );
    }

    // Build dynamic update
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (title) {
      updates.push('title');
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description');
      values.push(description || null);
    }
    if (unit) {
      updates.push('unit');
      values.push(unit);
    }

    // Update with dynamic fields
    let result;
    if (isUUID) {
      if (title && description !== undefined && unit) {
        result = await sql`
          UPDATE custom_data_sources
          SET title = ${title}, description = ${description || null}, unit = ${unit}, updated_at = NOW()
          WHERE source_id = ${id}::uuid
          RETURNING *
        `;
      } else if (title && description !== undefined) {
        result = await sql`
          UPDATE custom_data_sources
          SET title = ${title}, description = ${description || null}, updated_at = NOW()
          WHERE source_id = ${id}::uuid
          RETURNING *
        `;
      } else if (title && unit) {
        result = await sql`
          UPDATE custom_data_sources
          SET title = ${title}, unit = ${unit}, updated_at = NOW()
          WHERE source_id = ${id}::uuid
          RETURNING *
        `;
      } else if (description !== undefined && unit) {
        result = await sql`
          UPDATE custom_data_sources
          SET description = ${description || null}, unit = ${unit}, updated_at = NOW()
          WHERE source_id = ${id}::uuid
          RETURNING *
        `;
      } else if (title) {
        result = await sql`
          UPDATE custom_data_sources
          SET title = ${title}, updated_at = NOW()
          WHERE source_id = ${id}::uuid
          RETURNING *
        `;
      } else if (description !== undefined) {
        result = await sql`
          UPDATE custom_data_sources
          SET description = ${description || null}, updated_at = NOW()
          WHERE source_id = ${id}::uuid
          RETURNING *
        `;
      } else {
        result = await sql`
          UPDATE custom_data_sources
          SET unit = ${unit}, updated_at = NOW()
          WHERE source_id = ${id}::uuid
          RETURNING *
        `;
      }
    } else {
      const numericId = parseInt(id, 10);
      if (title && description !== undefined && unit) {
        result = await sql`
          UPDATE custom_data_sources
          SET title = ${title}, description = ${description || null}, unit = ${unit}, updated_at = NOW()
          WHERE id = ${numericId}
          RETURNING *
        `;
      } else if (title && description !== undefined) {
        result = await sql`
          UPDATE custom_data_sources
          SET title = ${title}, description = ${description || null}, updated_at = NOW()
          WHERE id = ${numericId}
          RETURNING *
        `;
      } else if (title && unit) {
        result = await sql`
          UPDATE custom_data_sources
          SET title = ${title}, unit = ${unit}, updated_at = NOW()
          WHERE id = ${numericId}
          RETURNING *
        `;
      } else if (description !== undefined && unit) {
        result = await sql`
          UPDATE custom_data_sources
          SET description = ${description || null}, unit = ${unit}, updated_at = NOW()
          WHERE id = ${numericId}
          RETURNING *
        `;
      } else if (title) {
        result = await sql`
          UPDATE custom_data_sources
          SET title = ${title}, updated_at = NOW()
          WHERE id = ${numericId}
          RETURNING *
        `;
      } else if (description !== undefined) {
        result = await sql`
          UPDATE custom_data_sources
          SET description = ${description || null}, updated_at = NOW()
          WHERE id = ${numericId}
          RETURNING *
        `;
      } else {
        result = await sql`
          UPDATE custom_data_sources
          SET unit = ${unit}, updated_at = NOW()
          WHERE id = ${numericId}
          RETURNING *
        `;
      }
    }

    const source = rowToCustomSource(result[0] as CustomDataSourceRow);

    return NextResponse.json({
      success: true,
      source: {
        sourceId: source.sourceId,
        title: source.title,
        description: source.description,
        unit: source.unit,
        updatedAt: source.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating custom source:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to update custom source' },
      { status: 500 }
    );
  }
}

// DELETE /api/custom-sources/[id] - Remove a custom source
// IMPORTANT: Caller must remove from config FIRST, then call delete
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const sql = neon(process.env.DATABASE_URL!);

    // Support both UUID (sourceId) and numeric (id) lookups
    const isUUID = id.includes('-');
    const result = isUUID
      ? await sql`DELETE FROM custom_data_sources WHERE source_id = ${id}::uuid RETURNING source_id`
      : await sql`DELETE FROM custom_data_sources WHERE id = ${parseInt(id, 10)} RETURNING source_id`;

    // Return 200 even if not found (idempotent)
    if (result.length === 0) {
      return NextResponse.json({ success: true, deleted: false });
    }

    // Optionally try to delete the cache file (best effort)
    // Note: In serverless, we can't reliably delete local files
    // The cache manager will handle stale files gracefully

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error('Error deleting custom source:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to delete custom source' },
      { status: 500 }
    );
  }
}
