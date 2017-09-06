import React, {Component} from 'react';
import PropTypes from 'prop-types';
//import _ from 'lodash';
import {
  TouchableWithoutFeedback,
  Text,
  View,
  Animated,
  Easing,
} from 'react-native';
import dateutils from '../../../dateutils';

import * as defaultStyle from '../../../style';
import styleConstructor from './style';

class Day extends Component {
  static propTypes = {
    // TODO: selected + disabled props should be removed
    state: PropTypes.oneOf(['selected', 'disabled', 'today', '']),

    // Specify theme properties to override specific styles for calendar parts. Default = {}
    theme: PropTypes.object,
    marked: PropTypes.any,

    onPress: PropTypes.func,

    markingExists: PropTypes.bool,
  };

  constructor(props) {
    super(props);
    this.theme = {...defaultStyle, ...(props.theme || {})};
    this.style = styleConstructor(props.theme);
    this.markingStyle = this.getDrawingStyle(props.marked);
  }
  
  shouldComponentUpdate(nextProps) {
    const newMarkingStyle = this.getDrawingStyle(nextProps.marked);

    if (JSON.stringify(this.markingStyle) !== JSON.stringify(newMarkingStyle)) {
      this.markingStyle = newMarkingStyle;
      return true;
    }

    return ['state', 'children'].reduce((prev, next) => {
      if (prev || nextProps[next] !== this.props[next]) {
        return true;
      }
      return prev;
    }, false);
  }

  getDrawingStyle(marking) {
    const { day, currentMonth } = this.props;
    const isSameMonth = dateutils.sameMonth(day, currentMonth);
    
    if (!marking) {
      return {};
    }
    return marking.reduce((prev, next) => {
      prev.textStyle = {};
      if (next.quickAction) {
        if (next.first || next.last) {
          prev.containerStyle = this.style.firstQuickAction;
          prev.textStyle = this.style.firstQuickActionText;
          if (next.endSelected && next.first && !next.last) {
            prev.rightFillerStyle = '#c1e4fe';
          } else if (next.endSelected && next.last && !next.first) {
            prev.leftFillerStyle = '#c1e4fe';
          }
        } else if (!next.endSelected) {
          prev.containerStyle = this.style.quickAction;
          prev.textStyle = this.style.quickActionText;
        } else if (next.endSelected) {
          prev.leftFillerStyle = '#c1e4fe';
          prev.rightFillerStyle = '#c1e4fe';
        }
        return prev;
      }

      const color = next.color;
      if (next.status === 'NotAvailable') {
        prev.textStyle = this.style.naText;
      }
      if (next.startingDay && isSameMonth) {
        prev.startingDay = {
          color
        };
      }
      if (next.endingDay && isSameMonth) {
        prev.endingDay = {
          color
        };
      }
      if (!next.startingDay && !next.endingDay && color && isSameMonth) {
        prev.day = {
          color
        };
      }
      if (next.textColor && isSameMonth) {
        prev.textStyle.color = next.textColor;
      }
      return prev;
    }, {});
  }

  render() {
    const { animationValue, day, currentMonth } = this.props;
    const containerStyle = [this.style.base];
    const textStyle = [this.style.text];
    const dotStyle = [this.style.dot];
    const isSameMonth = dateutils.sameMonth(day, currentMonth);
    let leftFillerStyle = {};
    let rightFillerStyle = {};
    let fillers;
    let dot;

    const flexFilled = animationValue ? animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }) : 1;

    const flexUnfilled = animationValue ? animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }) : 0;

    if (this.props.state === 'disabled') {
      textStyle.push(this.style.disabledText);
    } else if (this.props.state === 'today') {
      textStyle.push(this.style.todayText);
    }

    const prevTextColor = textStyle[textStyle.length-1].color;

    if (this.props.marked) {
      containerStyle.push({
        borderRadius: 17
      });

      const flags = this.markingStyle;
      if (flags.textStyle) {
        textStyle.push(flags.textStyle);
      }
      if (flags.containerStyle) {
        containerStyle.push(flags.containerStyle);
      }
      if (flags.leftFillerStyle) {
        leftFillerStyle.backgroundColor = flags.leftFillerStyle;
      }
      if (flags.rightFillerStyle) {
        rightFillerStyle.backgroundColor = flags.rightFillerStyle;
      }

      if (flags.startingDay && !flags.endingDay) {
        leftFillerStyle = {
          backgroundColor: this.theme.calendarBackground
        };
        rightFillerStyle = {
          backgroundColor: flags.startingDay.color
        };
        containerStyle.push({
          backgroundColor: flags.startingDay.color
        });
      } else if (flags.endingDay && !flags.startingDay) {
        rightFillerStyle = {
          backgroundColor: this.theme.calendarBackground
        };
        leftFillerStyle = {
          backgroundColor: flags.endingDay.color
        };
        containerStyle.push({
          //backgroundColor: flags.endingDay.color
        });
      } else if (flags.day) {
        leftFillerStyle = {backgroundColor: flags.day.color};
        rightFillerStyle = {backgroundColor: flags.day.color};
      } else if (flags.endingDay && flags.startingDay) {
        rightFillerStyle = {
          backgroundColor: this.theme.calendarBackground
        };
        leftFillerStyle = {
          backgroundColor: this.theme.calendarBackground
        };
        containerStyle.push({
          backgroundColor: flags.endingDay.color
        });
      }

      const marked = this.props.marked;

      if (marked && marked.some(item => item.marked)) {
        dotStyle.push(this.style.visibleDot);
        dot = (<View style={dotStyle}/>);
      }

      fillers = (
        <View style={this.style.fillers}>
          <View style={[this.style.leftFiller, leftFillerStyle]}/>
          <View style={[this.style.rightFiller, rightFillerStyle]}/>
        </View>
      );

      if (flags.startingDay && flags.endingDay) {
        fillers = <View style={this.style.fillers}>
          <View style={{
            height: this.style.fillers.height,
            flex: 1,
            marginLeft: 10,
            marginRight: 10,
            backgroundColor: flags.startingDay.color,
            borderRadius: 17,
          }}/>
        </View>
      } else if (flags.startingDay) {
        fillers = <View style={this.style.fillers}>
          <Animated.View style={{
            height: this.style.fillers.height,
            flex: 1,
            marginLeft: 10,
            backgroundColor: flags.startingDay.color,
            borderTopLeftRadius: 17,
            borderBottomLeftRadius: 17,
          }}/>
        </View>
      } else if (flags.endingDay) {
        fillers = <View style={this.style.fillers}>
          <Animated.View style={{
            height: this.style.fillers.height,
            flex: flexFilled,
            marginRight: 10,
            backgroundColor: flags.endingDay.color,
            borderTopRightRadius: 17,
            borderBottomRightRadius: 17,
          }}/>
          <Animated.View style={{
            flex: flexUnfilled,
          }} />
        </View>
      } else if (flags.day) {
        fillers = <View style={this.style.fillers}>
          <Animated.View style={{
            height: this.style.fillers.height,
            flex: flexFilled,
            backgroundColor: flags.day.color,
          }}/>
          <Animated.View style={{
            flex: flexUnfilled,
          }} />
        </View>
      }
    }

    const newTextColor = textStyle[textStyle.length-1].color;
    const hasNewColor = newTextColor !== undefined && prevTextColor !== newTextColor;

    if (animationValue && isSameMonth && hasNewColor) {
      textStyle[textStyle.length-1].color = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['#000', '#FFF'],
      });
    }

    return (
      <TouchableWithoutFeedback onPress={this.props.onPress}>
        <View style={this.style.wrapper}>
          {fillers}
          <View style={containerStyle}>
            {dot}
            <Animated.Text style={textStyle}>{String(this.props.children)}</Animated.Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

export default Day;
