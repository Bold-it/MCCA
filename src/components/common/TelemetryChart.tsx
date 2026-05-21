import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../theme';

interface TelemetryChartProps {
  history: number[];
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({ history }) => {
  const containerWidth = Dimensions.get('window').width - 48; // padding margin
  const height = 150;
  const paddingX = 20;
  const paddingY = 20;

  const pointsCount = history.length;
  const chartWidth = containerWidth - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Map scores to x, y coordinates
  const coords = history.map((score, index) => {
    const x = paddingX + (pointsCount > 1 ? (index / (pointsCount - 1)) * chartWidth : 0);
    // score 0 is at bottom (height - paddingY), score 100 is at top (paddingY)
    const y = paddingY + chartHeight - (score / 100) * chartHeight;
    return { x, y, score };
  });

  // Construct SVG Path
  let pathD = '';
  let areaD = '';

  if (coords.length > 0) {
    pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      pathD += ` L ${coords[i].x} ${coords[i].y}`;
    }

    // Closed path for gradient fill
    areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`;
  }

  // Helper for grid line y position
  const getGridY = (value: number) => paddingY + chartHeight - (value / 100) * chartHeight;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trust Score Telemetry</Text>
      
      <View style={styles.chartWrapper}>
        <Svg width={containerWidth} height={height}>
          <Defs>
            <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.4} />
              <Stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.0} />
            </LinearGradient>
          </Defs>

          {/* Grid lines & Labels */}
          {[100, 80, 60, 40].map((val) => {
            const y = getGridY(val);
            return (
              <React.Fragment key={val}>
                <Line
                  x1={paddingX}
                  y1={y}
                  x2={containerWidth - paddingX}
                  y2={y}
                  stroke={COLORS.border}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              </React.Fragment>
            );
          })}

          {/* Threshold alert lines */}
          <Line
            x1={paddingX}
            y1={getGridY(60)}
            x2={containerWidth - paddingX}
            y2={getGridY(60)}
            stroke={COLORS.warning}
            strokeWidth="1"
            opacity={0.6}
          />
          <Line
            x1={paddingX}
            y1={getGridY(40)}
            x2={containerWidth - paddingX}
            y2={getGridY(40)}
            stroke={COLORS.danger}
            strokeWidth="1.5"
            opacity={0.8}
          />

          {/* Gradient Area under line */}
          {areaD ? <Path d={areaD} fill="url(#gradient)" /> : null}

          {/* Main Line */}
          {pathD ? (
            <Path
              d={pathD}
              fill="none"
              stroke={COLORS.primary}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Interactive dots */}
          {coords.map((coord, index) => {
            // Determine dot color based on trust status
            let dotColor = COLORS.success;
            if (coord.score < 40) dotColor = COLORS.danger;
            else if (coord.score < 60) dotColor = COLORS.warning;
            else if (coord.score < 80) dotColor = COLORS.primary;

            return (
              <Circle
                key={index}
                cx={coord.x}
                cy={coord.y}
                r={index === coords.length - 1 ? "5" : "3.5"}
                fill={dotColor}
                stroke={COLORS.surface}
                strokeWidth={1.5}
              />
            );
          })}
        </Svg>
      </View>
      
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.legendText}>Secure (&gt;=80)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: COLORS.warning }]} />
          <Text style={styles.legendText}>Caution (60-79)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
          <Text style={styles.legendText}>Risk (&lt;60)</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING[16],
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING[24],
  },
  title: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: 'bold',
    marginBottom: SPACING[12],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING[12],
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING[8],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: COLORS.textSecondary,
    fontSize: 10,
  },
});
