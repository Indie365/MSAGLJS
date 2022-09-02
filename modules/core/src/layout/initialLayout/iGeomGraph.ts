import {Point, Rectangle} from '../../math/geometry'
import {GeomEdge, GeomNode} from '../core'

export interface IGeomGraph {
  Clusters: IterableIterator<IGeomGraph>
  subgraphsDepthFirst: IterableIterator<IGeomGraph>
  uniformMargins: number
  edges(): IterableIterator<GeomEdge>
  shallowNodes: IterableIterator<GeomNode>
  deepNodes: IterableIterator<GeomNode>
  pumpTheBoxToTheGraphWithMargins(): Rectangle
  shallowNodeCount: number
  deepNodeCount: number
  translate(delta: Point): void
  boundingBox: Rectangle
}
