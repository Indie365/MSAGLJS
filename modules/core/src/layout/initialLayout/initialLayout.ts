import {Algorithm} from '../../utils/algorithm'
import {IPsepCola} from '../incremental/iPsepCola'
import {IPsepColaSetting} from '../incremental/iPsepColaSettings'
import {MdsGraphLayout} from '../mds/mDSGraphLayout'
import {PivotMDS} from '../mds/pivotMDS'
import {IGeomGraph} from './iGeomGraph'
import {GeomConnectedComponent} from './geomConnectedComponent'
import {LayoutAlgorithmHelpers} from './layoutAlgorithmHelpers'
import {GTreeOverlapRemoval} from '../gTreeOverlapRemoval/gTreeOverlapRemoval'
import {GeomGraph} from '../core/geomGraph'
import {MdsLayoutSettings} from '../mds/mDSLayoutSettings'

//  Methods for obtaining an initial layout of a graph using various means.

export class InitialLayout extends Algorithm {
  private graph: GeomGraph

  private settings: IPsepColaSetting

  private componentCount: number

  //  Set to true if the graph specified is a single connected component with no clusters

  SingleComponent = false

  //  Static layout of graph by gradually adding constraints.
  //  Uses PivotMds to find initial layout.
  //  Breaks the graph into connected components (nodes of the same cluster are considered
  //  connected whether or not there is an edge between them), then lays out each component
  //  individually.  Finally, a simple packing is applied.
  //  ratio as close as possible to the PackingAspectRatio property (not currently used).

  public constructor(graph: GeomGraph, settings: IPsepColaSetting) {
    super(null)
    this.graph = graph
    this.settings = IPsepColaSetting.ctorClone(settings)
    this.settings.ApplyForces = true
    this.settings.InterComponentForces = true
    this.settings.RungeKuttaIntegration = false
    this.settings.RespectEdgePorts = false
  }

  //  The actual layout process

  run() {
    if (this.SingleComponent) {
      this.componentCount = 1
      this.LayoutComponent(this.graph)
    } else {
      const components = Array.from(this.graph.graph.getClusteredConnectedComponents()).map(
        (topNodes) => new GeomConnectedComponent(topNodes),
      )
      this.componentCount = components.length
      for (const component of components) {
        this.LayoutComponent(component)
      }

      this.graph.boundingBox = MdsGraphLayout.PackGraphs(components, this.settings.commonSettings)

      // for (let c of this.graph.subgraphs()) {
      //     let copy = (<GraphConnectedComponents.AlgorithmDataNodeWrap>(c.AlgorithmData));
      //     let copyCluster = (<Cluster>(copy.node));
      //     Assert.assert((copyCluster != null));
      //     c.RectangularBoundary = copyCluster.RectangularBoundary;
      //     c.RectangularBoundary.GenerateFixedConstraints = c.RectangularBoundary.GenerateFixedConstraintsDefault;
      //     c.BoundingBox = c.RectangularBoundary.Rect;
      //     c.RaiseLayoutDoneEvent();
      // }
    }
  }

  private LayoutComponent(component: IGeomGraph) {
    if (component.shallowNodeCount > 1) {
      //  for small graphs (below 100 nodes) do extra iterations
      this.settings.MaxIterations = LayoutAlgorithmHelpers.NegativeLinearInterpolation(component.shallowNodeCount, 50, 500, 5, 10)
      this.settings.MinorIterations = LayoutAlgorithmHelpers.NegativeLinearInterpolation(component.shallowNodeCount, 50, 500, 3, 20)
      if (this.settings.MinConstraintLevel == 0) {
        //  run PivotMDS with a largish Scale so that the layout comes back oversized.
        //  subsequent incremental iterations do a better job of untangling when they're pulling it in
        //  rather than pushing it apart.
        const mdsSettings = new MdsLayoutSettings()
        mdsSettings.removeOverlaps = false
        mdsSettings.IterationsWithMajorization = 0
        const pivotMDS = new PivotMDS(component, null, () => 1, new MdsLayoutSettings())
        pivotMDS.run()
      }

      const fil: IPsepCola = new IPsepCola(component, this.settings, this.settings.MinConstraintLevel)
      //Assert.assert(this.settings.Iterations == 0)
      for (const level of this.GetConstraintLevels(component)) {
        if (level > this.settings.MaxConstraintLevel) {
          break
        }

        if (level > this.settings.MinConstraintLevel) {
          fil.setCurrentConstraintLevel(level)
        }

        do {
          fil.run()
        } while (!this.settings.IsDone)
      }
      if (this.settings.AvoidOverlaps) {
        GTreeOverlapRemoval.RemoveOverlaps(Array.from(this.graph.shallowNodes), this.settings.NodeSeparation)
      }
    }

    component.pumpTheBoxToTheGraphWithMargins()
    //  Pad the graph with margins so the packing will be spaced out.
    component.uniformMargins = this.settings.NodeSeparation
    //  Zero the graph
    component.translate(component.boundingBox.leftBottom.mul(-1))
  }

  /** returns 0, 1 or 2:
   *   Get the distinct ConstraintLevels that need to be applied to layout.
    Used by InitialLayout.
   Will only include ConstraintLevel == 2 if AvoidOverlaps is on and there are fewer than 2000 nodes
   */
  GetConstraintLevels(component: IGeomGraph): Iterable<number> {
    const keys = new Set<number>()
    keys.add(0)
    if (this.settings.AvoidOverlaps && component.shallowNodeCount < 2000) {
      keys.add(2)
    }
    return keys
  }
}
