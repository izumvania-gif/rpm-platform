'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/current-user'
import { denyUnowned } from '@/lib/ownership'
import { linkMatrixByKind, type LinkKind } from '@/lib/link-matrix'

// One toggle of one cell in a link matrix (Связи).
//
// Non-redirecting on purpose — the whole value of the grid is that ticking
// forty boxes does not cost forty navigations, so this follows the
// createXQuick convention: `{ ok }` back to the client, which holds the
// optimistic state and reverts on failure.
//
// Both ids come from the client, so both go through denyUnowned — the row's
// model and the column's. Checking only one would leave the other as a
// cross-tenant write: `jtbd.update({ data: { segments: { connect: { id } } } })`
// happily attaches a segment belonging to somebody else.

export async function setLink(
  kind: LinkKind,
  rowId: string,
  colId: string,
  linked: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const meta = linkMatrixByKind(kind)
  const userId = getCurrentUserId()

  const rowDenied = await denyUnowned(meta.rowModel, rowId, userId)
  if (rowDenied) return rowDenied
  const colDenied = await denyUnowned(meta.colModel, colId, userId)
  if (colDenied) return colDenied

  const op = linked ? 'connect' : 'disconnect'

  switch (kind) {
    case 'segment-jtbd':
      await prisma.jTBD.update({
        where: { id: rowId },
        data: { segments: { [op]: { id: colId } } },
      })
      break
    case 'jtbd-feature':
      await prisma.feature.update({
        where: { id: rowId },
        data: { jtbds: { [op]: { id: colId } } },
      })
      break
    case 'feature-rtb':
      await prisma.feature.update({
        where: { id: rowId },
        data: { rtbs: { [op]: { id: colId } } },
      })
      break
  }

  // Everything that counts attachments rather than rows.
  revalidatePath('/jtbd')
  revalidatePath('/features')
  revalidatePath('/marketing')
  revalidatePath('/segments')
  revalidatePath('/reports/gaps')
  revalidatePath('/reports/segments-jtbd')
  revalidatePath('/')
  return { ok: true }
}
