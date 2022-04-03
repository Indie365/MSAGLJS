import {CurveFactory, Edge, GeomEdge, GeomGraph, GeomLabel, GeomNode, Graph, ICurve, Node, Point, Rectangle} from '../../../src'
import {DrawingObject} from '../../../src/drawing/drawingObject'
import {GeomObject} from '../../../src/layout/core/geomObject'
import {SingleSourceDistances} from '../../../src/layout/mds/SingleSourceDistances'
import {closeDistEps} from '../../../src/utils/compare'

export function createGeometry(g: Graph, nodeBoundaryFunc: (s: string) => ICurve, labelRect: (s: string) => Rectangle): GeomGraph {
  for (const n of g.shallowNodes) {
    if (n instanceof Graph) {
      const subG = n as unknown as Graph
      GeomGraph.mkWithGraphAndLabel(subG, null)
      createGeometry(subG, nodeBoundaryFunc, labelRect)
    } else {
      const gn = new GeomNode(n)
      //const tsize = getTextSize(drawingNode.label.text, drawingNode.fontname)
      const drawingObject = DrawingObject.getDrawingObj(n)
      const text = drawingObject ? drawingObject.labelText ?? n.id : n.id
      gn.boundaryCurve = nodeBoundaryFunc(text)
    }
  }
  for (const e of g.edges) {
    const ge = new GeomEdge(e)
    if (e.label) {
      /*Assert.assert(e.label != null)*/
      ge.label = new GeomLabel(labelRect(e.label.text), e.label)
    }
  }
  return GeomGraph.mkWithGraphAndLabel(g, null)
}

test('single source distances', () => {
  const graph = new Graph()
  // make a trapeze (abcd), with sides ab = 1, bc = 0.5, cd = 1, da = 1
  const a = new Node('a')
  const b = new Node('b')
  const c = new Node('c')
  const d = new Node('d')
  graph.addNode(a)
  graph.addNode(b)
  graph.addNode(c)
  graph.addNode(d)
  new Edge(a, b)
  const bc = new Edge(b, c)
  new Edge(c, d)
  new Edge(d, a)

  const nodes = []
  for (const n of graph.shallowNodes) {
    nodes.push(n)
  }

  // make sure that we iterate the nodes in the order abcd
  for (let i = 0; i < nodes.length; i++) expect(nodes[i].id.charAt(0)).toBe('abcd'.charAt(i))

  const geomGraph = createGeometry(
    graph,
    () => CurveFactory.createRectangle(10, 10, new Point(0, 0)),
    () => null,
  )
  const length = (e: GeomEdge) => (e.edge == bc ? 0.5 : 1)
  const ss = new SingleSourceDistances(geomGraph, <GeomNode>GeomObject.getGeom(a), length)
  ss.run()
  const res = ss.Result
  expect(res.length).toBe(4)
  expect(res[0]).toBe(0)
  expect(res[1]).toBe(1)
  expect(res[2]).toBe(1.5)
  expect(res[3]).toBe(1)
})

test('ss distances with decrease', () => {
  const graph = new Graph()
  // make a trapeze (abcd), with sides ab = 1, bc = 0.5, cd = 1, da = 1
  const a = new Node('a')
  const b = new Node('b')
  const c = new Node('c')
  const d = new Node('d')
  const e = new Node('e')
  const f = new Node('f')
  graph.addNode(a)
  graph.addNode(b)
  graph.addNode(c)
  graph.addNode(d)
  graph.addNode(e)
  graph.addNode(f)
  new Edge(a, b)
  new Edge(b, c)

  new Edge(c, d)
  new Edge(d, a)
  const ae = new Edge(a, e)
  const ef = new Edge(f, e)
  const cf = new Edge(c, f)
  const nodes = []
  for (const n of graph.shallowNodes) {
    nodes.push(n)
  }

  // make sure that we iterate the nodes in the order abcd
  for (let i = 0; i < nodes.length; i++) expect(nodes[i].id.charAt(0)).toBe('abcdef'.charAt(i))

  const geomGraph = createGeometry(
    graph,
    () => CurveFactory.createRectangle(10, 10, new Point(0, 0)),
    () => null,
  )
  const length = (e: GeomEdge) => {
    if (e.edge == ae || e.edge == ef || e.edge == cf) return 0.1
    return 1
  }
  const ss = new SingleSourceDistances(geomGraph, <GeomNode>GeomObject.getGeom(a), length)
  ss.run()
  const res = ss.Result
  expect(res[0]).toBe(0)
  expect(res[1]).toBe(1)
  expect(closeDistEps(res[2], 0.3)).toBe(true)
  expect(res[3]).toBe(1)
})