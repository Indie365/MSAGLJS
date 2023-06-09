import {Entity} from '../structs/entity'
import {ArrowTypeEnum} from './arrowTypeEnum'
import {DrawingObject} from './drawingObject'

export class DrawingEdge extends DrawingObject {
  directed = true
  arrowtail: ArrowTypeEnum
  arrowhead: ArrowTypeEnum
  constructor(entity: Entity, directed: boolean) {
    super(entity)
    this.directed = directed
    if (directed) {
      this.arrowhead = ArrowTypeEnum.normal
    } else {
      this.arrowhead = ArrowTypeEnum.none
    }

    this.arrowtail = ArrowTypeEnum.none
  }
  clone(): DrawingEdge {
    const ret = new DrawingEdge(null, this.directed)
    DrawingObject.copyValidFields(this, ret)
    ret.directed = this.directed
    ret.arrowtail = this.arrowtail
    ret.arrowhead = this.arrowhead
    return ret
  }
}
