import {LinkedList} from '@esfx/collections'
import {Rectangle} from '../../math/geometry'
import {CancelToken} from '../../utils/cancelToken'
import {EdgeConstraints} from '../edgeConstraints'
import {LayoutSettings} from '../layered/SugiyamaLayoutSettings'

export class FastIncrementalLayoutSettings extends LayoutSettings {
  ///  <summary>
  ///  Stop after maxIterations completed
  ///  </summary>
  maxIterations = 100

  ///  <summary>
  ///  Stop after maxIterations completed
  ///  </summary>
  public get MaxIterations(): number {
    return this.maxIterations
  }
  public set MaxIterations(value: number) {
    this.maxIterations = value
  }

  minorIterations = 3

  ///  <summary>
  ///  Number of iterations in inner loop.
  ///  </summary>
  public get MinorIterations(): number {
    return this.minorIterations
  }
  public set MinorIterations(value: number) {
    this.minorIterations = value
  }

  iterations: number

  ///  <summary>
  ///  Number of iterations completed
  ///  </summary>
  public get Iterations(): number {
    return this.iterations
  }
  public set Iterations(value: number) {
    this.iterations = value
  }

  projectionIterations = 5

  ///  <summary>
  ///  number of times to project over all constraints at each layout iteration
  ///  </summary>
  public get ProjectionIterations(): number {
    return this.projectionIterations
  }
  public set ProjectionIterations(value: number) {
    this.projectionIterations = value
  }

  approximateRepulsion = true

  ///  <summary>
  ///  Rather than computing the exact repulsive force between all pairs of nodes (which would take O(n^2) time for n nodes)
  ///  use a fast inexact technique (that takes O(n log n) time)
  ///  </summary>
  public get ApproximateRepulsion(): boolean {
    return this.approximateRepulsion
  }
  public set ApproximateRepulsion(value: boolean) {
    this.approximateRepulsion = value
  }

  ///  <summary>
  ///  RungaKutta integration potentially gives smoother increments, but is more expensive
  ///  </summary>
  RungeKuttaIntegration: boolean

  initialStepSize = 1.4

  ///  <summary>
  ///  StepSize taken at each iteration (a coefficient of the force on each node) adapts depending on change in
  ///  potential energy at each step.  With this scheme changing the InitialStepSize doesn't have much effect
  ///  because if it is too large or too small it will be quickly updated by the algorithm anyway.
  ///  </summary>
  public get InitialStepSize(): number {
    return this.initialStepSize
  }
  public set InitialStepSize(value: number) {
    if (value <= 0 || value > 2) {
      throw new Error(
        'ForceScalar should be greater than 0 and less than 2 (if we let you set it to 0 nothing would happen, greater than 2 would most likely be very unstable!)',
      )
    }

    this.initialStepSize = value
  }

  decay = 0.9

  ///  <summary>
  ///  FrictionalDecay isn't really friction so much as a scaling of velocity to improve convergence.  0.8 seems to work well.
  ///  </summary>
  public get Decay(): number {
    return this.decay
  }
  public set Decay(value: number) {
    if (value < 0.1 || value > 1) {
      throw new Error('Setting decay too small gives no progress.  1==no decay, 0.1==minimum allowed value')
    }

    this.decay = value
  }

  friction = 0.8

  ///  <summary>
  ///  Friction isn't really friction so much as a scaling of velocity to improve convergence.  0.8 seems to work well.
  ///  </summary>
  public get Friction(): number {
    return this.friction
  }
  public set Friction(value: number) {
    if (value < 0 || value > 1) {
      throw new Error(
        'Setting friction less than 0 or greater than 1 would just be strange.  1==no friction, 0==no conservation of velocity',
      )
    }

    this.friction = value
  }

  repulsiveForceConstant = 1

  ///  <summary>
  ///  strength of repulsive force between each pair of nodes.  A setting of 1.0 should work OK.
  ///  </summary>
  public get RepulsiveForceConstant(): number {
    return this.repulsiveForceConstant
  }
  public set RepulsiveForceConstant(value: number) {
    this.repulsiveForceConstant = value
  }

  attractiveForceConstant = 1

  ///  <summary>
  ///  strength of attractive force between pairs of nodes joined by an edge.  A setting of 1.0 should work OK.
  ///  </summary>
  public get AttractiveForceConstant(): number {
    return this.attractiveForceConstant
  }
  public set AttractiveForceConstant(value: number) {
    this.attractiveForceConstant = value
  }

  gravity = 1

  ///  <summary>
  ///  gravity is a constant force applied to all nodes attracting them to the Origin
  ///  and keeping disconnected components from flying apart.  A setting of 1.0 should work OK.
  ///  </summary>
  public get GravityConstant(): number {
    return this.gravity
  }
  public set GravityConstant(value: number) {
    this.gravity = value
  }

  interComponentForces = true

  ///  <summary>
  ///  If the following is false forces will not be considered between each component and each component will have its own gravity origin.
  ///  </summary>
  public get InterComponentForces(): boolean {
    return this.interComponentForces
  }
  public set InterComponentForces(value: boolean) {
    this.interComponentForces = value
  }

  applyForces = true

  ///  <summary>
  ///  If the following is false forces will not be applied, but constraints will still be satisfied.
  ///  </summary>
  public get ApplyForces(): boolean {
    return this.applyForces
  }
  public set ApplyForces(value: boolean) {
    this.applyForces = value
  }

  private /* internal */ algorithm: FastIncrementalLayout

  private /* internal */ locks: LinkedList<LockPosition> = new LinkedList<LockPosition>()

  ///  <summary>
  ///  Add a LockPosition for each node whose position you want to keep fixed.  LockPosition allows you to,
  ///  for example, do interactive mouse
  ///   dragging.
  ///  We return the LinkedListNode which you can store together with your local Node object so that a RemoveLock operation can be performed in
  ///  constant time.
  ///  </summary>
  ///  <param name="node"></param>
  ///  <param name="bounds"></param>
  ///  <returns>LinkedListNode which you should hang on to if you want to call RemoveLock later on.</returns>
  public CreateLock(node: Node, bounds: Rectangle): LockPosition {
    const lp: LockPosition = new LockPosition(node, bounds)
    lp.listNode = this.locks.AddLast(lp)
    return lp
  }

  ///  <summary>
  ///  Add a LockPosition for each node whose position you want to keep fixed.  LockPosition allows you to,
  ///  for example, do interactive mouse dragging.
  ///  We return the LinkedListNode which you can store together with your local Node object so that a RemoveLock operation can be performed in
  ///  constant time.
  ///  </summary>
  ///  <param name="node"></param>
  ///  <param name="bounds"></param>
  ///  <param name="weight">stay weight of lock</param>
  ///  <returns>LinkedListNode which you should hang on to if you want to call RemoveLock later on.</returns>
  public CreateLock(node: Node, bounds: Rectangle, weight: number): LockPosition {
    const lp: LockPosition = new LockPosition(node, bounds, weight)
    lp.listNode = this.locks.AddLast(lp)
    return lp
  }

  ///  <summary>
  ///  Remove all locks on node positions
  ///  </summary>
  public ClearLocks() {
    //             foreach (var l in locks) {
    //                 l.listNode = null;
    //             }
    this.locks.Clear()
  }

  ///  <summary>
  ///  Remove a specific lock on node position.  Once you remove it, you'll have to call AddLock again to create a new one if you want to lock it again.
  ///  </summary>
  ///  <param name="lockPosition">the LinkedListNode returned by the AddLock method above</param>
  @SuppressMessage(
    'Microsoft.Globalization',
    'CA1303:Do not pass literals as localized parameters',
    (MessageId = 'System.Diagnostics.Debug.WriteLine(System.String)'),
  )
  @SuppressMessage('Microsoft.Naming', 'CA2204:Literals should be spelled correctly', (MessageId = 'FastIncrementalLayoutSettings'))
  @SuppressMessage('Microsoft.Naming', 'CA2204:Literals should be spelled correctly', (MessageId = 'RemoveLock'))
  public RemoveLock(lockPosition: LockPosition) {
    ValidateArg.IsNotNull(lockPosition, 'lockPosition')
    if (lockPosition.listNode != null) {
      lockPosition.RestoreNodeWeight()
      try {
        this.locks.Remove(lockPosition.listNode)
      } catch (e /*:InvalidOperationException*/) {
        System.Diagnostics.Debug.WriteLine('Problem in FastIncrementalLayoutSettings.RemoveLock ' + e.Message)
      }

      lockPosition.listNode = null
    }
  }

  ///  <summary>
  ///  restart layout, use e.g. after a mouse drag or non-structural change to the graph
  ///  </summary>
  public ResetLayout() {
    this.Unconverge()
    if (this.algorithm != null) {
      this.algorithm.ResetNodePositions()
      this.algorithm.SetLockNodeWeights()
    }
  }

  ///  <summary>
  ///  reset iterations and convergence status
  ///  </summary>
  private /* internal */ Unconverge() {
    this.iterations = 0
    // EdgeRoutesUpToDate = false;
    converged = false
  }

  ///  <summary>
  ///
  ///  </summary>
  public InitializeLayout(graph: GeometryGraph, initialConstraintLevel: number) {
    this.InitializeLayout(graph, initialConstraintLevel, () => {}, this)
  }

  ///  <summary>
  ///  Initialize the layout algorithm
  ///  </summary>
  ///  <param name="graph">The graph upon which layout is performed</param>
  ///  <param name="initialConstraintLevel"></param>
  ///  <param name="clusterSettings"></param>
  public InitializeLayout(graph: GeometryGraph, initialConstraintLevel: number, clusterSettings: Func<Cluster, LayoutSettings>) {
    ValidateArg.IsNotNull(graph, 'graph')
    this.algorithm = new FastIncrementalLayout(graph, this, initialConstraintLevel, clusterSettings)
    this.ResetLayout()
  }

  ///  <summary>
  ///
  ///  </summary>
  public Uninitialize() {
    this.algorithm = null
  }

  ///  <summary>
  ///
  ///  </summary>
  public get IsInitialized(): boolean {
    return this.algorithm != null
  }

  ///  <summary>
  ///
  ///  </summary>
  public IncrementalRun(graph: GeometryGraph) {
    this.IncrementalRun(graph, () => {}, this)
  }

  private SetupIncrementalRun(graph: GeometryGraph, clusterSettings: Func<Cluster, LayoutSettings>) {
    ValidateArg.IsNotNull(graph, 'graph')
    if (!this.IsInitialized) {
      this.InitializeLayout(graph, MaxConstraintLevel, clusterSettings)
    } else if (IsDone) {
      //  If we were already done from last time but we are doing more work then something has changed.
      this.ResetLayout()
    }
  }

  ///  <summary>
  ///  Run the FastIncrementalLayout instance incrementally
  ///  </summary>
  public IncrementalRun(graph: GeometryGraph, clusterSettings: Func<Cluster, LayoutSettings>) {
    this.SetupIncrementalRun(graph, clusterSettings)
    this.algorithm.Run()
    graph.UpdateBoundingBox()
  }

  ///  <summary>
  ///
  ///  </summary>
  public IncrementalRun(cancelToken: CancelToken, graph: GeometryGraph, clusterSettings: Func<Cluster, LayoutSettings>) {
    if (cancelToken != null) {
      cancelToken.ThrowIfCanceled()
    }

    this.SetupIncrementalRun(graph, clusterSettings)
    this.algorithm.Run(cancelToken)
    graph.UpdateBoundingBox()
  }

  ///  <summary>
  ///  Clones the object
  ///  </summary>
  ///  <returns></returns>
  public /* override */ Clone(): LayoutSettings {
    return <LayoutSettings>MemberwiseClone()
  }

  ///  <summary>
  ///
  ///  </summary>
  public get StructuralConstraints(): IEnumerable<IConstraint> {
    return structuralConstraints
  }

  ///  <summary>
  ///
  ///  </summary>
  public AddStructuralConstraint(cc: IConstraint) {
    structuralConstraints.Add(cc)
  }

  private /* internal */ structuralConstraints: List<IConstraint> = new List<IConstraint>()

  ///  <summary>
  ///  Clear all constraints over the graph
  ///  </summary>
  public ClearConstraints() {
    this.locks.Clear()
    this.structuralConstraints.Clear()
    //  clusterHierarchies.Clear();
  }

  ///  <summary>
  ///
  ///  </summary>
  public ClearStructuralConstraints() {
    this.structuralConstraints.Clear()
  }

  ///  <summary>
  ///  Avoid overlaps between nodes boundaries, and if there are any
  ///  clusters, then between each cluster boundary and nodes that are not
  ///  part of that cluster.
  ///  </summary>
  public get AvoidOverlaps(): boolean {}
  public set AvoidOverlaps(value: boolean) {}

  ///  <summary>
  ///  If edges have FloatingPorts then the layout will optimize edge lengths based on the port locations.
  ///  If MultiLocationFloatingPorts are specified then the layout will choose the nearest pair of locations for each such edge.
  ///  </summary>
  public get RespectEdgePorts(): boolean {}
  public set RespectEdgePorts(value: boolean) {}

  ///  <summary>
  ///  Apply nice but expensive routing of edges once layout converges
  ///  </summary>
  public get RouteEdges(): boolean {}
  public set RouteEdges(value: boolean) {}

  approximateRouting = true

  ///  <summary>
  ///  If RouteEdges is true then the following is checked to see whether to do optimal shortest path routing
  ///  or use a sparse visibility graph spanner to do approximate---but much faster---shortest path routing
  ///  </summary>
  public get ApproximateRouting(): boolean {
    return this.approximateRouting
  }
  public set ApproximateRouting(value: boolean) {
    this.approximateRouting = value
  }

  logScaleEdgeForces = true

  ///  <summary>
  ///  If true then attractive forces across edges are computed as:
  ///  AttractiveForceConstant * actualLength * Math.Log((actualLength + epsilon) / (idealLength + epsilon))
  ///  where epsilon is a small positive constant to avoid divide by zero or taking the log of zero.
  ///  Note that LogScaleEdges can lead to ghost forces in highly constrained scenarios.
  ///  If false then a the edge force is based on (actualLength - idealLength)^2, which works better with
  ///  lots of constraints.
  ///  </summary>
  public get LogScaleEdgeForces(): boolean {
    return this.logScaleEdgeForces
  }
  public set LogScaleEdgeForces(value: boolean) {
    this.logScaleEdgeForces = value
  }

  displacementThreshold = 0.1

  ///  <summary>
  ///  If the amount of total squared displacement after a particular iteration falls below DisplacementThreshold then Converged is set to true.
  ///  Make DisplacementThreshold larger if you want layout to finish sooner - but not necessarily make as much progress towards a good layout.
  ///  </summary>
  public get DisplacementThreshold(): number {
    return this.displacementThreshold
  }
  public set DisplacementThreshold(value: number) {
    this.displacementThreshold = value
  }

  converged: boolean

  ///  <summary>
  ///  Set to true if displacement from the last iteration was less than DisplacementThreshold.
  ///  The caller should invoke FastIncrementalLayout.CalculateLayout() in a loop, e.g.:
  ///
  ///   while(!settings.Converged)
  ///   {
  ///     layout.CalculateLayout();
  ///     redrawGraphOrHandleInteractionOrWhatever();
  ///   }
  ///
  ///  RemainingIterations affects damping.
  ///  </summary>
  public get Converged(): boolean {
    return this.converged
  }
  public set Converged(value: boolean) {
    this.converged = value
  }

  ///  <summary>
  ///  Return iterations as a percentage of MaxIterations.  Useful for reporting progress, e.g. in a progress bar.
  ///  </summary>
  public get PercentDone(): number {
    if (this.Converged) {
      return 100
    } else {
      return <number>((100 * <number>this.iterations) / <number>this.MaxIterations)
    }
  }

  ///  <summary>
  ///  Not quite the same as Converged:
  ///  </summary>
  public get IsDone(): boolean {
    return this.Converged || this.iterations >= this.MaxIterations
  }

  ///  <summary>
  ///  Returns an estimate of the cost function calculated in the most recent iteration.
  ///  It's a float because FastIncrementalLayout.Energy is a volatile float so it
  ///  can be safely read from other threads
  ///  </summary>
  public get Energy(): number {
    if (this.algorithm != null) {
      return this.algorithm.energy
    }

    return 0
  }

  ///  <summary>
  ///  When layout is in progress the following is false.
  ///  When layout has converged, routes are populated and this is set to true to tell the UI that the routes can be drawn.
  ///  </summary>
  public get EdgeRoutesUpToDate(): boolean {}
  public set EdgeRoutesUpToDate(value: boolean) {}

  maxConstraintLevel = 2

  ///  <summary>
  ///
  ///  </summary>
  public get MaxConstraintLevel(): number {
    return this.maxConstraintLevel
  }
  public set MaxConstraintLevel(value: number) {
    if (this.maxConstraintLevel != value) {
      this.maxConstraintLevel = value
      if (this.IsInitialized) {
        this.Uninitialize()
      }
    }
  }

  minConstraintLevel = 0

  ///  <summary>
  ///
  ///  </summary>
  public get MinConstraintLevel(): number {
    return this.minConstraintLevel
  }
  public set MinConstraintLevel(value: number) {
    this.minConstraintLevel = value
  }

  ///  <summary>
  ///  Constraint level ranges from Min to MaxConstraintLevel.
  ///  0 = no constraints
  ///  1 = only structural constraints
  ///  2 = all constraints including non-overlap constraints
  ///
  ///  A typical run of FastIncrementalLayout will apply it at each constraint level, starting at 0 to
  ///  obtain an untangled unconstrained layout, then 1 to introduce structural constraints and finally 2 to beautify.
  ///  Running only at level 2 will most likely leave the graph stuck in a tangled local minimum.
  ///  </summary>
  public get CurrentConstraintLevel(): number {
    if (this.algorithm == null) {
      return 0
    }

    return this.algorithm.CurrentConstraintLevel
  }
  public set CurrentConstraintLevel(value: number) {
    this.algorithm.CurrentConstraintLevel = value
  }

  attractiveInterClusterForceConstant = 1

  ///  <summary>
  ///  Attractive strength of edges connected to clusters
  ///  </summary>
  public get AttractiveInterClusterForceConstant(): number {
    return this.attractiveInterClusterForceConstant
  }
  public set AttractiveInterClusterForceConstant(value: number) {
    this.attractiveInterClusterForceConstant = value
  }

  ///  <summary>
  ///
  ///  </summary>
  public constructor() {}

  ///  <summary>
  ///  Shallow copy the settings
  ///  </summary>
  ///  <param name="previousSettings"></param>
  public constructor(previousSettings: FastIncrementalLayoutSettings) {
    ValidateArg.IsNotNull(previousSettings, 'previousSettings')
    this.maxIterations = previousSettings.maxIterations
    this.minorIterations = previousSettings.minorIterations
    this.projectionIterations = previousSettings.projectionIterations
    this.approximateRepulsion = previousSettings.approximateRepulsion
    this.initialStepSize = previousSettings.initialStepSize
    this.RungeKuttaIntegration = previousSettings.RungeKuttaIntegration
    this.decay = previousSettings.decay
    this.friction = previousSettings.friction
    this.repulsiveForceConstant = previousSettings.repulsiveForceConstant
    this.attractiveForceConstant = previousSettings.attractiveForceConstant
    this.gravity = previousSettings.gravity
    this.interComponentForces = previousSettings.interComponentForces
    this.applyForces = previousSettings.applyForces
    IdealEdgeLength = previousSettings.IdealEdgeLength
    this.AvoidOverlaps = previousSettings.AvoidOverlaps
    this.RespectEdgePorts = previousSettings.RespectEdgePorts
    this.RouteEdges = previousSettings.RouteEdges
    this.approximateRouting = previousSettings.approximateRouting
    this.logScaleEdgeForces = previousSettings.logScaleEdgeForces
    this.displacementThreshold = previousSettings.displacementThreshold
    this.minConstraintLevel = previousSettings.minConstraintLevel
    this.maxConstraintLevel = previousSettings.maxConstraintLevel
    this.attractiveInterClusterForceConstant = previousSettings.attractiveInterClusterForceConstant
    clusterGravity = previousSettings.clusterGravity
    PackingAspectRatio = previousSettings.PackingAspectRatio
    NodeSeparation = previousSettings.NodeSeparation
    ClusterMargin = previousSettings.ClusterMargin
  }

  clusterGravity = 1

  ///  <summary>
  ///  Controls how tightly members of clusters are pulled together
  ///  </summary>
  public get ClusterGravity(): number {
    return this.clusterGravity
  }
  public set ClusterGravity(value: number) {
    this.clusterGravity = value
  }

  ///  <summary>
  ///  Settings for calculation of ideal edge length
  ///  </summary>
  public get IdealEdgeLength(): EdgeConstraints {}
  public set IdealEdgeLength(value: EdgeConstraints) {}

  updateClusterBoundaries = true

  ///  <summary>
  ///  Force groups to follow their constituent nodes,
  ///  true by default.
  ///  </summary>
  public get UpdateClusterBoundariesFromChildren(): boolean {
    return this.updateClusterBoundaries
  }
  public set UpdateClusterBoundariesFromChildren(value: boolean) {
    this.updateClusterBoundaries = value
  }

  ///  <summary>
  ///      creates the settings that seems working
  ///  </summary>
  ///  <returns></returns>
  public static CreateFastIncrementalLayoutSettings(): FastIncrementalLayoutSettings {
    const f = new FastIncrementalLayoutSettings()
    f.ApplyForces = false
    f.ApproximateRepulsion = true
    f.ApproximateRouting = true
    f.AttractiveForceConstant = 1.0
    f.AttractiveInterClusterForceConstant = 1.0
    f.AvoidOverlaps = true
    f.ClusterGravity = 1.0
    f.Decay = 0.9
    f.DisplacementThreshold = 0.00000005
    f.Friction = 0.8
    f.GravityConstant = 1.0
    f.InitialStepSize = 2.0
    f.InterComponentForces = false
    f.Iterations = 0
    f.LogScaleEdgeForces = false
    f.MaxConstraintLevel = 2
    f.MaxIterations = 20
    f.MinConstraintLevel = 0
    f.MinorIterations = 1
    f.ProjectionIterations = 5
    f.RepulsiveForceConstant = 2.0
    f.RespectEdgePorts = false
    f.RouteEdges = false
    f.RungeKuttaIntegration = true
    f.UpdateClusterBoundariesFromChildren = true
    f.NodeSeparation = 20
    return f
  }
}