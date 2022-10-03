import {
  SugiyamaLayoutSettings,
  LayeredLayout,
  CancelToken,
  Size,
  GeomNode,
  Graph,
  Node,
  GeomGraph,
  Edge,
  buildRTree,
  intersectedObjects,
  AttributeRegistry,
  GeomEdge,
  Point,
  CurveFactory,
  LineSegment,
  Rectangle,
  ICurve,
  Entity,
  GeomObject,
} from '../../../src'
import {ArrowTypeEnum} from '../../../src/drawing/arrowTypeEnum'
import {DrawingGraph} from '../../../src/drawing/drawingGraph'
import {buildRTreeWithInterpolatedEdges, getGeomIntersectedObjects, HitTreeNodeType, PpEdge} from '../../../src/layout/core/geomGraph'
import {initRandom} from '../../../src/utils/random'
import {SvgDebugWriter} from '../../utils/svgDebugWriter'
import {nodeBoundaryFunc, parseDotGraph} from '../../utils/testUtils'
import {createGeometry} from '../mds/SingleSourceDistances.spec'
test('subgraphs', () => {
  const graph = new Graph()
  const graphA = new Graph('a')
  graphA.addNode(new Node('node_of_a'))
  graph.addNode(graphA)
  const graphB = new Graph('b')
  graph.addNode(graphB)
  const graphAA = new Graph('aa')
  graphA.addNode(graphAA)
  const aaIds = Array.from(graph.allSuccessorsDepthFirst()).map((a) => a.id)

  const node_of_aIndex = aaIds.findIndex((a) => a == 'node_of_a')
  const aaIndex = aaIds.findIndex((a) => a == 'aa')

  const bIndex = aaIds.findIndex((a) => a == 'b')
  expect(bIndex > aaIndex).toBe(true)
  expect(node_of_aIndex < aaIndex)
})

test('empty subgraphs', () => {
  const g = GeomGraph.mk('graph', new Size(20, 30))

  expect(g.shallowNodeCount).toBe(0)
})
test('geom subgraphs', () => {
  const graph = new Graph()
  const graphA = new Graph('a')
  graphA.addNode(new Node('node_of_a'))
  graph.addNode(graphA)
  const graphB = new Graph('b')
  graph.addNode(graphB)
  const graphAA = new Graph('aa')
  graphA.addNode(graphAA)
  const gg = createGeometry(graph, nodeBoundaryFunc, () => null)
  const aaIds = Array.from(gg.subgraphsDepthFirst).map((n) => (n as unknown as GeomNode).id)
  const node_of_aIndex = aaIds.findIndex((a) => a == 'node_of_a')
  expect(node_of_aIndex).toBe(-1)
  const aaIndex = aaIds.findIndex((a) => a == 'aa')

  const bIndex = aaIds.findIndex((a) => a == 'b')
  expect(bIndex > aaIndex).toBe(true)
})

test('buildRTreeWithInterpolatedEdges', () => {
  initRandom(1) // to remove randomness further on
  const g = parseDotGraph('graphvis/fsm.gv')
  const dg = DrawingGraph.getDrawingObj(g) as DrawingGraph
  //create an edge with the arrowhead at source
  const edge = Array.from(g.deepEdges)[0]
  edge.getAttr(AttributeRegistry.DrawingObjectIndex).arrowhead = ArrowTypeEnum.normal
  edge.getAttr(AttributeRegistry.DrawingObjectIndex).arrowtail = ArrowTypeEnum.normal
  const geomGraph = dg.createGeometry()
  const ss = new SugiyamaLayoutSettings()
  const ll = new LayeredLayout(geomGraph, ss, new CancelToken())
  ll.run()
  SvgDebugWriter.writeGeomGraph('./tmp/fsm.svg', geomGraph)

  const slack = 0.05
  const tree = buildRTreeWithInterpolatedEdges(g, slack)

  // centers are hit
  for (const n of g.deepNodes) {
    const gn = n.getAttr(AttributeRegistry.GeomObjectIndex)
    let found = false
    for (const n of getGeomIntersectedObjects(tree, slack, gn.center)) {
      if (n === gn) found = true
    }
    expect(found).toBe(true)
  }

  // edges are hit
  for (const n of g.deepEdges) {
    const ge = n.getAttr(AttributeRegistry.GeomObjectIndex) as GeomEdge
    if (ge.toString() == 'LR_8->LR_6') {
      console.log(ge)
    }
    const t = Math.random()
    let found = false
    const hitItems: Array<GeomObject> = Array.from(
      getGeomIntersectedObjects(tree, slack, ge.curve.value(ge.curve.parStart * t + (1 - t) * ge.curve.parEnd)),
    )
    for (const n of hitItems) {
      if (n === ge) found = true
    }
    if (found == false) {
      const p = ge.curve.value(ge.curve.parStart * t + (1 - t) * ge.curve.parEnd)
      const rect = Rectangle.mkSizeCenter(new Size(slack * 2), p)
      const hitItems: Array<HitTreeNodeType> = Array.from(tree.RootNode.AllHitItems(rect, null))
      const subHitItems = hitItems.filter((i) => i instanceof Entity == false) as Array<PpEdge>

      SvgDebugWriter.dumpICurves(
        './tmp/debug.svg',
        [CurveFactory.mkCircle(5, p) as ICurve].concat(subHitItems.map((m) => LineSegment.mkPP(m.pp.first, m.pp.second))),
      )
    }
    expect(found).toBe(true)
    if (ge.targetArrowhead) {
      found = false
      for (const n of getGeomIntersectedObjects(tree, slack, Point.middle(ge.curve.end, ge.targetArrowhead.tipPosition))) {
        if (n === ge) found = true
      }
      expect(found).toBe(true)
    }
    if (ge.sourceArrowhead) {
      found = false
      for (const n of getGeomIntersectedObjects(tree, slack, Point.middle(ge.curve.start, ge.sourceArrowhead.tipPosition))) {
        if (n === ge) found = true
      }
      expect(found).toBe(true)
    }
  }
  //labels are hit
  for (const n of g.deepEdges) {
    const ge = n.getAttr(AttributeRegistry.GeomObjectIndex) as GeomEdge
    const label = ge.label
    if (label == null) continue
    let found = false
    for (const n of getGeomIntersectedObjects(tree, slack, label.boundingBox.leftTop)) {
      if (n === ge.label) found = true
    }
    expect(found).toBe(true)
  }

  initRandom(0) // to remove randomness further on
})

test('intersectedEnities', () => {
  const g = parseDotGraph('graphvis/abstract.gv')
  const dg = DrawingGraph.getDrawingObj(g) as DrawingGraph
  const geomGraph = dg.createGeometry(() => new Size(20, 20))
  const ss = new SugiyamaLayoutSettings()
  const ll = new LayeredLayout(geomGraph, ss, new CancelToken())
  ll.run()
  const rect = geomGraph.boundingBox
  const rtree = buildRTree(geomGraph.graph)
  const intersectedNodes = Array.from(intersectedObjects(rtree, rect))
  let n = 0 // the number of nodes that intersected the bounding box
  let e = 0 // the number of edges that intersected the bounding box
  for (const o of intersectedNodes) {
    if (o instanceof Node) {
      n++
    } else if (o instanceof Edge) {
      e++
    }
  }

  expect(n).toBe(Array.from(geomGraph.deepNodesIt()).length)
  expect(e).toBe(0)

  const intersectedNodesAndEdges = Array.from(intersectedObjects(rtree, rect, false)).filter((e) => e instanceof Edge)

  expect(intersectedNodesAndEdges.length).toBe(Array.from(geomGraph.deepEdges).length)
  for (const e of geomGraph.edges()) {
    const r = e.boundingBox
    const intersected_e = Array.from(intersectedObjects(rtree, r, false))
    expect(intersected_e.indexOf(e.edge)).toBeGreaterThan(-1)
    expect(intersected_e.indexOf(e.edge.source)).toBeGreaterThan(-1)
    expect(intersected_e.indexOf(e.edge.target)).toBeGreaterThan(-1)
  }
})
